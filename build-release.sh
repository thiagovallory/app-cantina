#!/bin/bash

# Script de build para gerar executáveis para todas as plataformas
# Execute: chmod +x build-release.sh && ./build-release.sh

echo "🚀 Iniciando build dos executáveis..."
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não está instalado. Por favor, instale o Node.js primeiro.${NC}"
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Instalando dependências...${NC}"
    npm install
fi

# Limpar builds anteriores
echo -e "${YELLOW}🧹 Limpando builds anteriores...${NC}"
rm -rf dist release

# Build da aplicação web
echo -e "${YELLOW}🔨 Compilando aplicação...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao compilar a aplicação${NC}"
    exit 1
fi

# Detectar sistema operacional
OS=$(uname -s)
echo ""
echo -e "${GREEN}📍 Sistema detectado: $OS${NC}"
echo ""

# Menu de seleção
echo "Escolha quais versões deseja gerar:"
echo "1) Windows (.exe)"
echo "2) macOS (.dmg)"
echo "3) Linux (AppImage)"
echo "4) Todas as plataformas"
echo "5) Apenas a do sistema atual"
echo ""
read -p "Opção (1-5): " choice

case $choice in
    1)
        echo -e "${YELLOW}🪟 Gerando versão Windows...${NC}"
        npm run dist-win
        ;;
    2)
        echo -e "${YELLOW}🍎 Gerando versão macOS...${NC}"
        npm run dist-mac
        ;;
    3)
        echo -e "${YELLOW}🐧 Gerando versão Linux...${NC}"
        npm run dist-linux
        ;;
    4)
        echo -e "${YELLOW}📦 Gerando todas as versões...${NC}"
        npm run dist
        ;;
    5)
        echo -e "${YELLOW}💻 Gerando versão para sistema atual...${NC}"
        if [[ "$OS" == "Darwin" ]]; then
            npm run dist-mac
        elif [[ "$OS" == "Linux" ]]; then
            npm run dist-linux
        else
            echo -e "${RED}❌ Sistema não suportado para build automático${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac

# Verificar se o build foi bem sucedido
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
    echo ""
    echo "📂 Os executáveis estão na pasta: release/"
    echo ""
    ls -lh release/ 2>/dev/null | grep -E '\.(exe|dmg|AppImage|deb|rpm|zip)' | awk '{print "   • " $9 " (" $5 ")"}'
    echo ""
    echo -e "${GREEN}🎉 Pronto para distribuição!${NC}"
else
    echo -e "${RED}❌ Erro durante o build${NC}"
    exit 1
fi