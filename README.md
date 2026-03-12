# App Cantina

Aplicativo para operacao de cantina em acampamentos, retiros e eventos, com interface React, modo desktop via Electron e backend local em Node.js + SQLite.

## Visao geral

O projeto foi pensado para uso rapido no caixa, com sincronizacao de dados em tempo real entre frontend e backend local. Ele cobre o fluxo completo da cantina:

- cadastro e manutencao de pessoas com saldo
- cadastro de produtos com codigo de barras, preco e estoque
- vendas com validacao de saldo e baixa de estoque
- historico de compras por pessoa
- importacao em massa via CSV
- relatorios em CSV e PDF
- configuracao de marca da organizacao
- acompanhamento de ofertas missionarias
- encerramento do acampamento com consolidacao dos dados

## Stack

- Frontend: React 19, TypeScript, Vite e Material UI
- Desktop: Electron
- Backend: Node.js, Express, Socket.IO e SQLite
- Relatorios e utilitarios: jsPDF, Papa Parse, QRCode

## Estrutura do projeto

```text
.
|-- src/                 # frontend React
|-- server/              # API HTTP + banco SQLite local
|-- electron/            # shell desktop do aplicativo
|-- scripts/             # utilitarios de desenvolvimento
|-- exemplos-csv/        # arquivos modelo para importacao
|-- docs/                # arquivos auxiliares
|-- build-release.sh     # build desktop em macOS/Linux
`-- build-release.bat    # build desktop em Windows
```

## Requisitos

- Node.js 20.19+ ou 22.12+
- npm

## Instalacao

Instale as dependencias do frontend e do backend:

```bash
npm install
cd server
npm install
cd ..
```

## Execucao em desenvolvimento

Para subir frontend e backend juntos:

```bash
npm run start
```

Esse comando:

- inicia a API em `http://localhost:3000`
- inicia o frontend em `https://localhost:5173`
- exibe URLs locais da rede e um QR Code para abrir no celular

Se quiser rodar as partes separadamente:

```bash
# frontend web
npm run dev

# backend
cd server
npm run start
```

Para abrir o app desktop durante o desenvolvimento:

```bash
ELECTRON_IS_DEV=true npx electron .
```

Ou, depois de subir o frontend com `npm run dev`:

```bash
npm run electron-dev
```

## Principais recursos

### Pessoas

- cadastro com nome, foto, identificador customizado e deposito inicial
- controle de saldo e historico de compras
- consulta rapida por busca

### Produtos

- cadastro com nome, codigo de barras, preco e estoque
- atualizacao de custo e quantidade comprada
- leitura por camera ou digitacao manual

### Vendas

- carrinho com validacao de saldo
- baixa automatica de estoque
- registro de compras por pessoa

### Importacao e relatorios

- importacao CSV de produtos e pessoas
- exportacao de relatorios em CSV e PDF
- exemplos prontos em `exemplos-csv/`

### Encerramento de acampamento

- consolida saldos finais
- registra doacao ou saque
- zera estoque e saldos
- gera relatorios finais automaticamente

## Scripts

```bash
# desenvolvimento
npm run start
npm run dev
npm run electron-dev

# qualidade
npm run lint

# build web
npm run build
npm run preview

# build desktop
npm run dist
npm run dist-win
npm run dist-mac
npm run dist-linux
```

## Build para distribuicao

Build web:

```bash
npm run build
```

Artefatos em `dist/`.

Build desktop:

```bash
./build-release.sh
```

No Windows:

```bat
build-release.bat
```

Artefatos em `release/`.

## Dados locais

O backend usa SQLite e grava o banco local em `server/data/cantina.db`. Esse arquivo nao deve ser versionado como base oficial do projeto.

Os certificados em `certs/` sao usados para desenvolvimento local com HTTPS, especialmente para liberar acesso a camera no navegador.

## Documentacao complementar

- [DEPLOY.md](/Users/thiagonunes/github/app-cantina/DEPLOY.md)
- [REDE.md](/Users/thiagonunes/github/app-cantina/REDE.md)
- [EXECUTAVEIS.md](/Users/thiagonunes/github/app-cantina/EXECUTAVEIS.md)
- [exemplos-csv/README.md](/Users/thiagonunes/github/app-cantina/exemplos-csv/README.md)

## Licenca

Ainda nao definida.
