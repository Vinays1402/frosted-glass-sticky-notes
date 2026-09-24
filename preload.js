const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAllNotes: () => ipcRenderer.invoke('get-all-notes'),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  saveAllNotes: (notes) => ipcRenderer.invoke('save-all-notes', notes),
  setWindowMode: (mode) => ipcRenderer.invoke('set-window-mode', mode),
  togglePin: (id, pinState) => ipcRenderer.invoke('toggle-pin', pinState),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  openJson: () => ipcRenderer.invoke('open-json'),
  logIssue: (level, message, stack) => ipcRenderer.invoke('log-issue', level, message, stack)
});
