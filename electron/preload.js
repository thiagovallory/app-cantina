// Preload script para segurança adicional (opcional)
const { contextBridge, ipcRenderer } = require('electron');

// Exposer APIs seguras para o renderer process se necessário
contextBridge.exposeInMainWorld('electronAPI', {
  // Exemplo: obter versão do app
  getVersion: () => process.versions.electron,
});