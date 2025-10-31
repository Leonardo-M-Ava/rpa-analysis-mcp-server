import winston from 'winston';
import path from 'path';

export class Logger {
  private logger: winston.Logger;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { 
        service: 'rpa-analysis-mcp',
        version: '1.0.0'
      },
      transports: [
        // File di log per errori
        new winston.transports.File({ 
          filename: path.join(logsDir, 'error.log'), 
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // File di log combinato
        new winston.transports.File({ 
          filename: path.join(logsDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // Console output con colori
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
            })
          )
        })
      ],
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', { promise, reason });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  info(message: string, meta?: any) {
    this.logger.info(message, meta);
  }

  error(message: string, error?: any) {
    this.logger.error(message, { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error 
    });
  }

  warn(message: string, meta?: any) {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any) {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any) {
    this.logger.verbose(message, meta);
  }

  // Metodo per logging specifico delle operazioni RPA
  rpaOperation(operation: string, details: any) {
    this.logger.info(`RPA Operation: ${operation}`, {
      operation,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Metodo per logging delle performance
  performance(operation: string, duration: number, meta?: any) {
    this.logger.info(`Performance: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      ...meta
    });
  }

  // Metodo per creare un child logger con contesto
  child(context: Record<string, any>) {
    return {
      info: (message: string, meta?: any) => this.info(message, { ...context, ...meta }),
      error: (message: string, error?: any) => this.error(message, error),
      warn: (message: string, meta?: any) => this.warn(message, { ...context, ...meta }),
      debug: (message: string, meta?: any) => this.debug(message, { ...context, ...meta }),
    };
  }
}