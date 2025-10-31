import fs from 'fs/promises';
import path from 'path';

export class FileUtils {
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  static async getFileExtension(filePath: string): Promise<string> {
    return path.extname(filePath).toLowerCase();
  }

  static async isVideoFile(filePath: string): Promise<boolean> {
    const videoExtensions = [
      '.mp4', '.avi', '.mov', '.wmv', '.mkv', 
      '.webm', '.flv', '.m4v', '.3gp', '.ogv'
    ];
    const extension = await this.getFileExtension(filePath);
    return videoExtensions.includes(extension);
  }

  static async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      throw new Error(`Cannot get file size: ${error}`);
    }
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async cleanupTempFiles(directory: string, olderThanMs: number = 3600000): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > olderThanMs) {
          if (stats.isDirectory()) {
            await fs.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.warn(`Errore nella pulizia file temporanei: ${error}`);
    }
  }

  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  static async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.backup.${timestamp}`;
    
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }

  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }
}