#!/bin/bash

set -e

# Colori per output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 RPA Analysis MCP Server - Avvio Locale${NC}"
echo "============================================="

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non installato"
    exit 1
fi

# Verifica NPM
if ! command -v npm &> /dev/null; then
    echo "❌ NPM non installato"
    exit 1
fi

# Verifica FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg non trovato - alcune funzioni potrebbero non funzionare"
fi

# Crea directory necessarie
echo -e "${YELLOW}📁 Creazione directory...${NC}"
mkdir -p temp output logs src/templates

# Installa dipendenze se necessario
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installazione dipendenze...${NC}"
    npm install
fi

# Verifica file .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creazione file .env da template...${NC}"
    cp .env.example .env
    echo "⚠️  Ricordati di configurare le variabili in .env"
fi

# Build del progetto
echo -e "${YELLOW}🔨 Build del progetto...${NC}"
npm run build

# Avvio del server
echo -e "${GREEN}🚀 Avvio server MCP...${NC}"
echo ""
echo "Server disponibile per connessioni MCP"
echo "Premi Ctrl+C per fermare il server"
echo ""

npm start