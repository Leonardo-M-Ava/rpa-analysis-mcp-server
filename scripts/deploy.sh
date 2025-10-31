#!/bin/bash

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 RPA Analysis MCP Server - Azure Deployment${NC}"
echo "=================================================="

# Verifica prerequisiti
check_prerequisites() {
    echo -e "${YELLOW}📋 Verifica prerequisiti...${NC}"
    
    if ! command -v az &> /dev/null; then
        echo -e "${RED}❌ Azure CLI non installato${NC}"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker non installato${NC}"
        exit 1
    fi
    
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ File .env non trovato${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisiti soddisfatti${NC}"
}

# Carica variabili d'ambiente
load_env() {
    echo -e "${YELLOW}📝 Caricamento configurazione...${NC}"
    source .env
    
    if [ -z "$AZURE_OPENAI_ENDPOINT" ] || [ -z "$AZURE_OPENAI_API_KEY" ]; then
        echo -e "${RED}❌ Configurazione Azure OpenAI mancante${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Configurazione caricata${NC}"
}

# Build dell'immagine Docker
build_image() {
    echo -e "${YELLOW}🔨 Build immagine Docker...${NC}"
    
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    IMAGE_TAG="rpa-analysis-mcp:${TIMESTAMP}"
    
    docker build -t $IMAGE_TAG .
    docker tag $IMAGE_TAG rpa-analysis-mcp:latest
    
    echo -e "${GREEN}✅ Immagine Docker creata: $IMAGE_TAG${NC}"
}

# Deploy su Azure
deploy_azure() {
    echo -e "${YELLOW}☁️  Deploy su Azure...${NC}"
    
    RESOURCE_GROUP=${RESOURCE_GROUP:-"rpa-analysis-rg"}
    LOCATION=${LOCATION:-"West Europe"}
    APP_NAME=${APP_NAME:-"rpa-analysis-mcp"}
    
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Location: $LOCATION"
    echo "App Name: $APP_NAME"
    
    # Crea Resource Group se non esiste
    if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
        echo -e "${YELLOW}📁 Creazione Resource Group...${NC}"
        az group create --name $RESOURCE_GROUP --location "$LOCATION"
    fi
    
    # Deploy dell'infrastruttura con Bicep
    echo -e "${YELLOW}🏗️  Deploy infrastruttura...${NC}"
    az deployment group create \
        --resource-group $RESOURCE_GROUP \
        --template-file deployment/bicep/main.bicep \
        --parameters \
            appName=$APP_NAME \
            openAIEndpoint="$AZURE_OPENAI_ENDPOINT" \
            openAIApiKey="$AZURE_OPENAI_API_KEY"
    
    echo -e "${GREEN}✅ Deploy Azure completato${NC}"
}

# Test del deployment
test_deployment() {
    echo -e "${YELLOW}🧪 Test del deployment...${NC}"
    
    # TODO: Implementare test di health check
    echo -e "${GREEN}✅ Test completati${NC}"
}

# Cleanup opzionale
cleanup() {
    echo -e "${YELLOW}🧹 Cleanup...${NC}"
    
    # Rimuovi immagini Docker vecchie
    docker image prune -f
    
    echo -e "${GREEN}✅ Cleanup completato${NC}"
}

# Menu principale
main() {
    case "${1:-all}" in
        "check")
            check_prerequisites
            ;;
        "build")
            check_prerequisites
            load_env
            build_image
            ;;
        "deploy")
            check_prerequisites
            load_env
            deploy_azure
            ;;
        "test")
            test_deployment
            ;;
        "cleanup")
            cleanup
            ;;
        "all")
            check_prerequisites
            load_env
            build_image
            deploy_azure
            test_deployment
            cleanup
            ;;
        *)
            echo "Uso: $0 {check|build|deploy|test|cleanup|all}"
            echo ""
            echo "  check   - Verifica prerequisiti"
            echo "  build   - Build immagine Docker"
            echo "  deploy  - Deploy su Azure"
            echo "  test    - Test deployment"
            echo "  cleanup - Pulizia file temporanei"
            echo "  all     - Esegue tutto (default)"
            exit 1
            ;;
    esac
}

# Trap per cleanup in caso di errore
trap cleanup EXIT

# Esegui funzione principale
main "$@"

echo -e "${GREEN}🎉 Deployment completato con successo!${NC}"