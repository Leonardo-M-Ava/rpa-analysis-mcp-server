import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VideoProcessor } from './services/video-processor.js';
import { AzureOpenAIService } from './services/azure-openai.js';
import { DocumentGenerator } from './services/document-generator.js';
import { Logger } from './utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class RPAAnalysisMCPServer {
  private server: Server;
  private videoProcessor: VideoProcessor;
  private openAIService: AzureOpenAIService;
  private documentGenerator: DocumentGenerator;
  private logger: Logger;

  constructor() {
    this.server = new Server(
      {
        name: 'rpa-analysis-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.logger = new Logger();
    this.videoProcessor = new VideoProcessor(this.logger);
    this.openAIService = new AzureOpenAIService(this.logger);
    this.documentGenerator = new DocumentGenerator(this.logger);

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_video_for_rpa',
          description: 'Analizza un video per estrarre azioni RPA e test case utilizzando Azure OpenAI',
          inputSchema: {
            type: 'object',
            properties: {
              videoPath: {
                type: 'string',
                description: 'Percorso del file video da analizzare',
              },
              processName: {
                type: 'string',
                description: 'Nome del processo RPA da documentare',
              },
              outputFormat: {
                type: 'string',
                enum: ['docx', 'md'],
                description: 'Formato del documento di output',
                default: 'docx',
              },
              frameInterval: {
                type: 'number',
                description: 'Intervallo in secondi per estrazione frame',
                default: 5,
              },
              templateType: {
                type: 'string',
                enum: ['standard', 'detailed', 'minimal'],
                description: 'Tipo di template per il documento',
                default: 'standard',
              },
            },
            required: ['videoPath', 'processName'],
          },
        },
        {
          name: 'generate_rpa_document',
          description: 'Genera documento di analisi funzionale da dati strutturati',
          inputSchema: {
            type: 'object',
            properties: {
              processData: {
                type: 'object',
                description: 'Dati strutturati del processo RPA',
                properties: {
                  processName: { type: 'string' },
                  summary: { type: 'string' },
                  rpaActions: { type: 'array' },
                  testCases: { type: 'array' },
                  recommendations: { type: 'array' },
                },
                required: ['processName'],
              },
              outputFormat: {
                type: 'string',
                enum: ['docx', 'md'],
                description: 'Formato del documento',
                default: 'docx',
              },
              templateType: {
                type: 'string',
                enum: ['standard', 'detailed', 'minimal'],
                description: 'Tipo di template',
                default: 'standard',
              },
              author: {
                type: 'string',
                description: 'Nome autore del documento',
                default: 'Sistema Automatico RPA',
              },
            },
            required: ['processData'],
          },
        },
        {
          name: 'extract_video_frames',
          description: 'Estrae frame da un video per analisi manuale',
          inputSchema: {
            type: 'object',
            properties: {
              videoPath: {
                type: 'string',
                description: 'Percorso del file video',
              },
              intervalSeconds: {
                type: 'number',
                description: 'Intervallo in secondi tra i frame',
                default: 5,
              },
              maxFrames: {
                type: 'number',
                description: 'Numero massimo di frame da estrarre',
                default: 20,
              },
            },
            required: ['videoPath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'analyze_video_for_rpa':
            return await this.analyzeVideoForRPA(args);
          case 'generate_rpa_document':
            return await this.generateRPADocument(args);
          case 'extract_video_frames':
            return await this.extractVideoFrames(args);
          default:
            throw new Error(`Tool sconosciuto: ${name}`);
        }
      } catch (error) {
        this.logger.error('Errore nell\'esecuzione del tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async analyzeVideoForRPA(args: any) {
    const { 
      videoPath, 
      processName, 
      outputFormat = 'docx',
      frameInterval = 5,
      templateType = 'standard'
    } = args;

    this.logger.info(`🎬 Inizio analisi video RPA: ${videoPath}`);

    try {
      // 1. Validazione file video
      const isValidVideo = await this.videoProcessor.validateVideoFile(videoPath);
      if (!isValidVideo) {
        throw new Error('File video non valido o non supportato');
      }

      // 2. Estrazione frame dal video
      this.logger.info('📹 Estrazione frame dal video...');
      const frames = await this.videoProcessor.extractFrames(videoPath, frameInterval);
      
      if (frames.length === 0) {
        throw new Error('Nessun frame estratto dal video');
      }

      this.logger.info(`✅ Estratti ${frames.length} frame dal video`);

      // 3. Analisi con Azure OpenAI
      this.logger.info('🤖 Analisi frame con Azure OpenAI...');
      const analysisResult = await this.openAIService.analyzeFramesForRPA(frames, processName);

      // 4. Generazione documento
      this.logger.info('📄 Generazione documento di analisi...');
      const documentPath = await this.documentGenerator.generateDocument({
        processName,
        summary: analysisResult.summary,
        rpaActions: analysisResult.rpaActions,
        testCases: analysisResult.testCases,
        recommendations: analysisResult.recommendations,
        format: outputFormat,
        templateType,
        author: 'Sistema Automatico RPA',
        version: '1.0',
      });

      this.logger.info('🎉 Analisi completata con successo!');

      return {
        content: [
          {
            type: 'text',
            text: `# 🎉 Analisi Video RPA Completata!\n\n` +
                  `**Processo**: ${processName}\n` +
                  `**Video analizzato**: ${videoPath}\n` +
                  `**Frame processati**: ${frames.length}\n` +
                  `**Documento generato**: ${documentPath}\n\n` +
                  `## 📊 Risultati Analisi:\n` +
                  `- ✅ **Azioni RPA identificate**: ${analysisResult.rpaActions.length}\n` +
                  `- 🧪 **Test case generati**: ${analysisResult.testCases.length}\n` +
                  `- 💡 **Raccomandazioni**: ${analysisResult.recommendations.length}\n\n` +
                  `## 📋 Riassunto Processo:\n${analysisResult.summary}\n\n` +
                  `Il documento completo è disponibile in: \`${documentPath}\``
          },
        ],
      };

    } catch (error) {
      this.logger.error('Errore durante l\'analisi video RPA', error);
      throw error;
    }
  }

  private async generateRPADocument(args: any) {
    const { 
      processData, 
      outputFormat = 'docx',
      templateType = 'standard',
      author = 'Sistema Automatico RPA'
    } = args;

    this.logger.info(`📄 Generazione documento RPA: ${processData.processName}`);

    try {
      const documentPath = await this.documentGenerator.generateDocument({
        ...processData,
        format: outputFormat,
        templateType,
        author,
        version: '1.0',
      });

      return {
        content: [
          {
            type: 'text',
            text: `# 📄 Documento RPA Generato!\n\n` +
                  `**Processo**: ${processData.processName}\n` +
                  `**Formato**: ${outputFormat.toUpperCase()}\n` +
                  `**Template**: ${templateType}\n` +
                  `**Documento**: ${documentPath}\n\n` +
                  `✅ Documento di analisi funzionale generato con successo!`
          },
        ],
      };

    } catch (error) {
      this.logger.error('Errore durante la generazione documento', error);
      throw error;
    }
  }

  private async extractVideoFrames(args: any) {
    const { 
      videoPath, 
      intervalSeconds = 5,
      maxFrames = 20
    } = args;

    this.logger.info(`🎬 Estrazione frame da: ${videoPath}`);

    try {
      const frames = await this.videoProcessor.extractFrames(
        videoPath, 
        intervalSeconds, 
        maxFrames
      );

      return {
        content: [
          {
            type: 'text',
            text: `# 🎬 Frame Estratti dal Video\n\n` +
                  `**Video**: ${videoPath}\n` +
                  `**Frame estratti**: ${frames.length}\n` +
                  `**Intervallo**: ogni ${intervalSeconds} secondi\n\n` +
                  `I frame sono pronti per l'analisi manuale o automatica.`
          },
        ],
      };

    } catch (error) {
      this.logger.error('Errore durante l\'estrazione frame', error);
      throw error;
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('🚀 Server MCP per analisi RPA avviato con successo!');
    this.logger.info('📋 Tool disponibili:');
    this.logger.info('  - analyze_video_for_rpa: Analisi completa video RPA');
    this.logger.info('  - generate_rpa_document: Generazione documento da dati');
    this.logger.info('  - extract_video_frames: Estrazione frame video');
  }
}

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutdown del server MCP...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutdown del server MCP...');
  process.exit(0);
});

// Avvio del server
const server = new RPAAnalysisMCPServer();
server.start().catch((error) => {
  console.error('❌ Errore critico nell\'avvio del server:', error);
  process.exit(1);
});