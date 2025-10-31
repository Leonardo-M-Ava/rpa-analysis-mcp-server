# Multi-stage build per ottimizzare le dimensioni
FROM node:18-alpine AS builder

# Installa dipendenze di build
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copia package files
COPY package*.json ./
COPY tsconfig.json ./

# Installa dipendenze
RUN npm ci

# Copia codice sorgente
COPY src/ ./src/

# Build dell'applicazione
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Installa FFmpeg e altre dipendenze runtime
RUN apk add --no-cache \
    ffmpeg \
    ffmpeg-dev \
    imagemagick \
    && rm -rf /var/cache/apk/*

# Crea utente non-root per security
RUN addgroup -g 1001 -S rpauser && \
    adduser -S rpauser -u 1001

WORKDIR /app

# Copia package files e installa solo dipendenze production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copia build artifacts dal builder stage
COPY --from=builder /app/dist ./dist

# Copia template e altri asset
COPY src/templates ./src/templates

# Crea directory necessarie con permessi corretti
RUN mkdir -p temp output logs && \
    chown -R rpauser:rpauser /app

# Switch a utente non-root
USER rpauser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "console.log('Health check')" || exit 1

# Expose porta
EXPOSE 3000

# Variabili di ambiente di default
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV PORT=3000

# Start dell'applicazione
CMD ["node", "dist/server.js"]