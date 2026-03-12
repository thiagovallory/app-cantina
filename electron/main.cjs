const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

const isDev = process.env.ELECTRON_IS_DEV === 'true';
const devOrigin = 'https://localhost:5173';

if (isDev) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

function createWindow() {
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
    titleBarStyle: 'default',
    show: false
  });

  // Carregar a aplicação
  const startUrl = isDev 
    ? devOrigin
    : `file://${path.join(__dirname, '../dist/index.html')}`;
    
  mainWindow.loadURL(startUrl);

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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

// Menu personalizado
function createMenu() {
  const template = [
    {
      label: 'App Cantina',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            // Pode abrir um modal "sobre" aqui
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
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Sair quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Configurações de segurança
app.on('web-contents-created', (event, contents) => {
  // Bloquear navegação para URLs externas
  contents.on('will-navigate', (navigationEvent, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== devOrigin && !isDev) {
      navigationEvent.preventDefault();
    }
  });
});
