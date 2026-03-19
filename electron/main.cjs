const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const fs = require('fs');
const net = require('net');
const path = require('path');

app.setName('App Cantina');

const isDev = process.env.ELECTRON_IS_DEV === 'true';
const devOrigin = 'https://localhost:5173';
let serverStartedByElectron = false;
let stopServer;
let desktopPort = 3000;
let logFilePath = null;
let startupStep = 0;

if (isDev) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

function formatLogMessage(level, message) {
  return `[${new Date().toISOString()}] [${level}] ${message}\n`;
}

function writeLog(level, message, error) {
  const details = error instanceof Error
    ? `${message}\n${error.stack || error.message}`
    : message;
  const formatted = formatLogMessage(level, details);

  console[level === 'ERROR' ? 'error' : 'log'](details);

  if (!logFilePath) {
    return;
  }

  try {
    fs.appendFileSync(logFilePath, formatted, 'utf8');
  } catch (writeError) {
    console.error('Falha ao gravar log do aplicativo:', writeError);
  }
}

function logStartupStep(message) {
  startupStep += 1;
  writeLog('INFO', `CHECKLIST ${String(startupStep).padStart(2, '0')} - ${message}`);
}

function getDesktopOrigin() {
  return `http://127.0.0.1:${desktopPort}`;
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort() {
  const preferredPorts = [3000, 3001, 3002, 3010, 3100];

  for (const port of preferredPorts) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error('Não foi possível encontrar uma porta local livre para iniciar o servidor interno.');
}

function createWindow() {
  logStartupStep('Criando a janela principal do aplicativo.');
  writeLog('INFO', `Criando janela principal na URL ${isDev ? devOrigin : getDesktopOrigin()}`);
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Necessário para câmera funcionar
    },
    icon: path.join(__dirname, 'assets', 'icon.png'), // Opcional: adicione um ícone
    backgroundColor: '#edf3f8',
    title: 'App Cantina',
    titleBarStyle: 'default',
    show: false
  });

  // Carregar a aplicação
  const startUrl = isDev
    ? devOrigin
    : getDesktopOrigin();

  mainWindow.loadURL(startUrl);
  writeLog('INFO', `Solicitado carregamento da interface em ${startUrl}`);

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    logStartupStep('Janela principal pronta para exibicao.');
    writeLog('INFO', 'Janela principal pronta para exibicao.');
    mainWindow.show();
  });

  mainWindow.webContents.once('did-finish-load', () => {
    logStartupStep(`Interface carregada com sucesso em ${startUrl}.`);
  });

  mainWindow.webContents.on('did-fail-load', async (_event, errorCode, errorDescription, validatedURL) => {
    writeLog('ERROR', `Falha ao carregar renderer: ${validatedURL} (${errorCode} - ${errorDescription})`);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Falha ao abrir o App Cantina',
      message: 'O aplicativo não conseguiu carregar a interface.',
      detail: [
        `URL: ${validatedURL}`,
        `Código: ${errorCode}`,
        `Descrição: ${errorDescription}`,
        `Porta local: ${desktopPort}`
      ].join('\n')
    });
    app.quit();
  });

  // Abrir DevTools apenas em desenvolvimento
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Interceptar links externos
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

async function ensureDesktopServer() {
  if (isDev) {
    logStartupStep('Modo desenvolvimento detectado; servidor interno nao sera iniciado.');
    return;
  }

  logStartupStep('Preparando diretorio de dados e log do desktop.');
  process.env.APP_CANTINA_DATA_DIR = path.join(app.getPath('userData'), 'data');
  process.env.APP_CANTINA_LOG_FILE = logFilePath;
  logStartupStep('Carregando modulo do backend empacotado.');
  const serverModule = require('../server/src/index.cjs');

  stopServer = serverModule.stopServer;
  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    logStartupStep(`Procurando uma porta local livre para o servidor interno (tentativa ${attempt}).`);
    desktopPort = await findAvailablePort();
    process.env.PORT = String(desktopPort);
    writeLog('INFO', `Porta local selecionada para o servidor interno: ${desktopPort}`);
    logStartupStep(`Porta ${desktopPort} reservada para o servidor interno.`);
    logStartupStep('Iniciando o servidor interno do aplicativo.');

    try {
      await serverModule.startServer(desktopPort);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      writeLog('ERROR', `Falha ao iniciar o servidor interno na porta ${desktopPort}.`, error);

      if (!(error instanceof Error) || !String(error.message).includes('EADDRINUSE') || attempt === 5) {
        throw error;
      }

      writeLog('INFO', `A porta ${desktopPort} ficou indisponivel durante a inicializacao. Tentando novamente.`);
    }
  }

  if (lastError) {
    throw lastError;
  }

  serverStartedByElectron = true;
  logStartupStep(`Servidor interno iniciado com sucesso na porta ${desktopPort}.`);
  writeLog('INFO', 'Servidor interno iniciado com sucesso.');
}

// Menu personalizado
function createMenu() {
  const template = [
    {
      label: 'App Cantina',
      submenu: [
        {
          label: 'Sobre',
          click: async () => {
            await dialog.showMessageBox({
              type: 'info',
              title: 'Sobre o App Cantina',
              message: 'App Cantina',
              detail: [
                'Sistema de gestão de cantina para eventos, retiros e acampamentos.',
                `Versao: ${app.getVersion()}`,
                'Distribuicao desktop para Windows e macOS.'
              ].join('\n')
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Selecionar Tudo', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        { label: 'Cortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forçar Recarga', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Ferramentas de Desenvolvedor', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom Real', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Aumentar Zoom', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Diminuir Zoom', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Tela Cheia', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        { label: 'Minimizar', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Fechar', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Evento quando o Electron terminou de inicializar
app.whenReady().then(async () => {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  logFilePath = path.join(logsDir, 'main.log');
  startupStep = 0;
  logStartupStep(`Inicializacao iniciada. userData=${app.getPath('userData')}`);
  writeLog('INFO', `Inicializando App Cantina. userData=${app.getPath('userData')}`);
  logStartupStep('Validando e iniciando dependencias locais.');
  await ensureDesktopServer();
  logStartupStep('Dependencias locais prontas; criando a interface desktop.');
  createWindow();
  logStartupStep('Configurando menu do aplicativo.');
  createMenu();
  logStartupStep('Menu configurado. Aguardando exibicao da janela.');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      logStartupStep('Aplicativo reativado sem janelas abertas; recriando janela principal.');
      createWindow();
    }
  });
}).catch((error) => {
  writeLog('ERROR', 'Falha ao iniciar o aplicativo desktop.', error);
  dialog.showErrorBox(
    'Falha ao iniciar o App Cantina',
    [
      error instanceof Error ? error.message : 'Erro desconhecido ao iniciar o aplicativo.',
      logFilePath ? `Log: ${logFilePath}` : ''
    ].filter(Boolean).join('\n')
  );
  app.quit();
});

// Sair quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async (event) => {
  if (!serverStartedByElectron) {
    return;
  }

  event.preventDefault();
  serverStartedByElectron = false;

  try {
    await stopServer();
  } catch (error) {
    writeLog('ERROR', 'Falha ao encerrar o servidor interno.', error);
  }

  app.quit();
});

// Configurações de segurança
app.on('web-contents-created', (event, contents) => {
  // Bloquear navegação para URLs externas
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== devOrigin && !isDev) {
      writeLog('INFO', `Bloqueando navegacao externa: ${navigationUrl}`);
      navigationEvent.preventDefault();
    }
  });
});

process.on('uncaughtException', (error) => {
  writeLog('ERROR', 'Excecao nao tratada no processo principal.', error);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  writeLog('ERROR', 'Promise rejeitada sem tratamento no processo principal.', error);
});
