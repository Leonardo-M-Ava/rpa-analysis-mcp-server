import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { Logger } from '../utils/logger.js';
import { FileUtils } from '../utils/file-utils.js';
import { v4 as uuidv4 } from 'uuid';
import Jimp from 'jimp';

export interface VideoFrame {
  id: string;
  timestamp: number;
  frameNumber: number;
  base64: string;
  width: number;
  height: number;
  filePath: string;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  format: string;
  size: number;
}

export class VideoProcessor {
  private tempDir: string;

  constructor(private logger: Logger) {
    this.tempDir = path.join(process.cwd(), 'temp', 'video-processing');
    this.initializeDirectories();
  }

  private async initializeDirectories() {
    await FileUtils.ensureDirectory(this.tempDir);
  }

  async validateVideoFile(videoPath: string): Promise<boolean> {
    try {
      // Controlla se il file esiste
      await fs.access(videoPath);
      
      // Controlla se è un file video supportato
      const isVideo = await FileUtils.isVideoFile(videoPath);
      if (!isVideo) {
        throw new Error('Formato file non supportato');
      }

      // Tenta di ottenere metadata per validare il file
      await this.getVideoMetadata(videoPath);
      
      return true;
    } catch (error) {
      this.logger.error(`Validazione file video fallita: ${videoPath}`, error);
      return false;
    }
  }

  async getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Errore lettura metadata video: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        if (!videoStream) {
          reject(new Error('Nessuno stream video trovato nel file'));
          return;
        }

        const stats = metadata.format;
        
        resolve({
          duration: stats.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: this.parseFPS(videoStream.r_frame_rate || '25/1'),
          format: stats.format_name || 'unknown',
          size: stats.size || 0,
        });
      });
    });
  }

  private parseFPS(frameRate: string): number {
    const [num, den = 1] = frameRate.split('/').map(Number);
    return Math.round(num / den);
  }

  async extractFrames(
    videoPath: string, 
    intervalSeconds: number = 5,
    maxFrames: number = 50
  ): Promise<VideoFrame[]> {
    const sessionId = uuidv4();
    const outputDir = path.join(this.tempDir, sessionId);
    
    try {
      await FileUtils.ensureDirectory(outputDir);
      
      this.logger.info(`Estrazione frame da: ${path.basename(videoPath)}`);
      
      // Ottieni metadata del video
      const metadata = await this.getVideoMetadata(videoPath);
      const duration = metadata.duration;
      
      // Calcola numero di frame da estrarre
      const frameCount = Math.min(
        Math.floor(duration / intervalSeconds),
        maxFrames
      );

      if (frameCount === 0) {
        throw new Error('Video troppo corto per estrarre frame');
      }

      const frames: VideoFrame[] = [];

      // Estrai frame a intervalli regolari
      for (let i = 0; i < frameCount; i++) {
        const timestamp = i * intervalSeconds;
        const frameId = uuidv4();
        const framePath = path.join(outputDir, `frame_${i.toString().padStart(4, '0')}_${frameId}.png`);

        try {
          await this.extractSingleFrame(videoPath, timestamp, framePath);
          
          // Verifica che il frame sia stato creato
          await fs.access(framePath);
          
          // Ottieni informazioni sull'immagine e converti in base64
          const image = await Jimp.read(framePath);
          const base64 = await this.frameToBase64(framePath);

          frames.push({
            id: frameId,
            timestamp,
            frameNumber: i + 1,
            base64,
            width: image.getWidth(),
            height: image.getHeight(),
            filePath: framePath,
          });

          this.logger.info(`Frame estratto: ${i + 1}/${frameCount} (${timestamp.toFixed(1)}s)`);
          
        } catch (frameError) {
          this.logger.warn(`Errore estrazione frame ${i + 1}: ${frameError}`);
          continue;
        }
      }

      if (frames.length === 0) {
        throw new Error('Nessun frame estratto con successo');
      }

      this.logger.info(`✅ Estrazione completata: ${frames.length} frame estratti`);
      return frames;

    } catch (error) {
      this.logger.error('Errore durante estrazione frame', error);
      throw error;
    } finally {
      // Cleanup file temporanei dopo un delay per permettere l'utilizzo
      setTimeout(async () => {
        await this.cleanup(outputDir);
      }, 60000); // 1 minuto
    }
  }

  private async extractSingleFrame(
    videoPath: string, 
    timestamp: number, 
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout nell'estrazione frame a ${timestamp}s`));
      }, 30000); // 30 secondi di timeout

      ffmpeg(videoPath)
        .seekInput(timestamp)
        .frames(1)
        .outputOptions([
          '-q:v 2', // Alta qualità
          '-vf scale=1920:1080:force_original_aspect_ratio=decrease', // Ridimensiona mantenendo aspect ratio
        ])
        .output(outputPath)
        .on('end', () => {
          clearTimeout(timeoutId);
          resolve();
        })
        .on('error', (err) => {
          clearTimeout(timeoutId);
          reject(new Error(`Errore FFmpeg: ${err.message}`));
        })
        .run();
    });
  }

  private async frameToBase64(framePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(framePath);
      return buffer.toString('base64');
    } catch (error) {
      throw new Error(`Errore conversione frame in base64: ${error}`);
    }
  }

  async cleanup(directory: string) {
    try {
      const exists = await fs.access(directory).then(() => true).catch(() => false);
      if (exists) {
        await fs.rm(directory, { recursive: true, force: true });
        this.logger.info(`🧹 Pulizia completata: ${directory}`);
      }
    } catch (error) {
      this.logger.warn(`Errore nella pulizia file temporanei: ${error}`);
    }
  }

  // Metodo per ottenere informazioni sui formati supportati
  getSupportedFormats(): string[] {
    return ['.mp4', '.avi', '.mov', '.wmv', '.mkv', '.webm', '.flv', '.m4v'];
  }

  // Metodo per stimare la dimensione dell'output
  async estimateProcessingTime(videoPath: string, intervalSeconds: number): Promise<number> {
    try {
      const metadata = await this.getVideoMetadata(videoPath);
      const frameCount = Math.floor(metadata.duration / intervalSeconds);
      
      // Stima: circa 1-2 secondi per frame + overhead
      return frameCount * 1.5 + 10;
    } catch {
      return 60; // Stima di default
    }
  }
}