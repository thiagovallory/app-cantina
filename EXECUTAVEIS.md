# 📦 Gerando Executáveis do App Cantina

Este guia explica como gerar versões executáveis do App Cantina para Windows, macOS e Linux.

## 🎯 Visão Geral

O App Cantina pode ser distribuído como:
- **🪟 Windows**: Instalador `.exe`
- **🍎 macOS**: Arquivo `.dmg`
- **🐧 Linux**: AppImage universal

## 📋 Pré-requisitos

1. **Node.js** versão 20.19+ ou 22.12+
2. **npm** (incluído com Node.js)
3. **Git** (opcional, para clonar o projeto)

## 🚀 Gerando Executáveis

### Método 1: Scripts Automáticos (Recomendado)

#### 🍎 macOS / 🐧 Linux

1. Torne o script executável:
```bash
chmod +x build-release.sh
```

2. Execute o script:
```bash
./build-release.sh
```

3. Escolha a opção desejada:
   - `1` - Apenas Windows
   - `2` - Apenas macOS
   - `3` - Apenas Linux
   - `4` - Todas as plataformas
   - `5` - Sistema atual

#### 🪟 Windows

1. Abra o Command Prompt ou PowerShell na pasta do projeto

2. Execute o script:
```batch
build-release.bat
```

3. Escolha a versão:
   - `1` - Windows 64-bit
   - `2` - Windows 32-bit
   - `3` - Ambas versões

### Método 2: Comandos Manuais

#### Preparação (Todas as Plataformas)

```bash
# Instalar dependências
npm install

# Compilar aplicação
npm run build
```

#### Gerar Executáveis

**Windows:**
```bash
npm run dist-win
```

**macOS:**
```bash
npm run dist-mac
```

**Linux:**
```bash
npm run dist-linux
```

**Todas as plataformas:**
```bash
npm run dist
```

## 📂 Localização dos Executáveis

Após o build, os executáveis estarão em:
```
app-cantina/
└── release/
    ├── App Cantina Setup 1.0.0.exe     # Windows
    ├── App Cantina-1.0.0.dmg           # macOS
    └── App Cantina-1.0.0.AppImage      # Linux
```

## 🔧 Configurações Avançadas

### Personalizar Ícones

Coloque seus ícones em `electron/assets/`:
- **Windows**: `icon.ico` (256x256)
- **macOS**: `icon.icns` (512x512)
- **Linux**: `icon.png` (512x512)

### Alterar Informações do App

Edite `package.json`:
```json
{
  "name": "app-cantina",
  "version": "1.0.0",
  "build": {
    "appId": "com.suaorganizacao.cantina",
    "productName": "App Cantina",
    ...
  }
}
```

## 💿 Instalação dos Executáveis

### 🪟 Windows

1. Execute o arquivo `.exe`
2. Siga o assistente de instalação
3. O app será instalado em `C:\Program Files\App Cantina`
4. Atalho criado no Desktop e Menu Iniciar

### 🍎 macOS

1. Abra o arquivo `.dmg`
2. Arraste o App Cantina para a pasta Applications
3. Na primeira execução, clique direito → Abrir (contorna Gatekeeper)

### 🐧 Linux

1. Torne o AppImage executável:
```bash
chmod +x "App Cantina-1.0.0.AppImage"
```

2. Execute diretamente:
```bash
./"App Cantina-1.0.0.AppImage"
```

Ou integre ao sistema:
```bash
# Mover para diretório de aplicações
sudo mv "App Cantina-1.0.0.AppImage" /opt/
# Criar atalho no menu
sudo ln -s /opt/"App Cantina-1.0.0.AppImage" /usr/local/bin/app-cantina
```

## 🛠️ Solução de Problemas

### ❓ "Erro ao compilar"

```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build
```

### ❓ "Comando não encontrado" (macOS/Linux)

```bash
# Verificar se Node.js está instalado
node --version
npm --version

# Se não estiver, instale via:
# macOS: brew install node
# Linux: sudo apt install nodejs npm
```

### ❓ "Windows Defender bloqueia o app"

1. Clique em "Mais informações"
2. Selecione "Executar mesmo assim"
3. Ou adicione exceção no Windows Defender

### ❓ "macOS diz que app é de desenvolvedor não identificado"

```bash
# Remover quarentena
xattr -d com.apple.quarantine "/Applications/App Cantina.app"

# Ou nas Preferências do Sistema:
# Segurança e Privacidade → Permitir apps de: Qualquer lugar
```

### ❓ "AppImage não executa no Linux"

```bash
# Instalar FUSE (necessário para AppImage)
sudo apt install libfuse2  # Ubuntu/Debian
sudo dnf install fuse      # Fedora
```

## 📊 Tamanhos Aproximados

| Plataforma | Tamanho do Instalador | Tamanho Instalado |
|------------|----------------------|-------------------|
| Windows    | ~80 MB               | ~200 MB          |
| macOS      | ~90 MB               | ~250 MB          |
| Linux      | ~95 MB               | ~240 MB          |

## 🔄 Atualizando a Versão

1. Edite a versão em `package.json`:
```json
"version": "1.1.0"
```

2. Gere novos executáveis com os scripts

3. Os arquivos terão o novo número de versão automaticamente

## 🚀 Distribuição

### Opções de Distribuição

1. **📧 Email/WhatsApp**: Envie o instalador diretamente
2. **☁️ Nuvem**: Upload para Google Drive, Dropbox, etc.
3. **🌐 Site**: Hospede em seu servidor
4. **💾 Pendrive**: Copie o instalador para distribuição offline

### Estrutura Recomendada para Distribuição

```
Distribuicao-App-Cantina/
├── Windows/
│   └── App-Cantina-Setup.exe
├── macOS/
│   └── App-Cantina.dmg
├── Linux/
│   └── App-Cantina.AppImage
├── LEIA-ME.txt
└── Manual-Usuario.pdf
```

## 🎯 Checklist de Lançamento

- [ ] Testar aplicação web (`npm run dev`)
- [ ] Atualizar versão no `package.json`
- [ ] Gerar builds para todas as plataformas
- [ ] Testar instalação em cada sistema
- [ ] Verificar funcionalidades principais
- [ ] Preparar documentação de uso
- [ ] Fazer backup do código fonte
- [ ] Distribuir para usuários

## 💡 Dicas

1. **Sempre teste** o executável antes de distribuir
2. **Mantenha backups** dos instaladores de cada versão
3. **Documente mudanças** entre versões
4. **Considere assinatura digital** para evitar avisos de segurança
5. **Use versionamento semântico**: MAJOR.MINOR.PATCH

## 📚 Recursos Adicionais

- [Documentação Electron](https://www.electronjs.org/docs)
- [Electron Builder](https://www.electron.build/)
- [Guia de Distribuição](https://www.electronjs.org/docs/tutorial/distribution)

---

📧 **Suporte**: Em caso de dúvidas sobre a geração de executáveis, consulte a documentação principal ou abra uma issue no GitHub.