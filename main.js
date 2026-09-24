const fs = require('fs');
const path = require('path');
const { initLogger, writeToLog } = require('./logger');

// Initialize issue logger
initLogger();

function log(msg) {
  writeToLog('INFO', 'MAIN', msg);
}

const { app, BrowserWindow, ipcMain, Tray, Menu, shell, nativeImage, screen } = require('electron');

// Ultra-Low RAM & CPU Chrome Flags
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=64');
app.commandLine.appendSwitch('renderer-process-limit', '1');
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService,CalculateNativeWinOcclusion');

const DATA_FILE = path.join(__dirname, 'sticky_notes.json');
const STATE_FILE = path.join(__dirname, 'window_state.json');
const ICON_ICO = path.join(__dirname, 'assets', 'icon.ico');
const ICON_PNG = path.join(__dirname, 'assets', 'icon.png');
const STARTUP_DIR = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming'),
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup'
);
const STARTUP_SCRIPT = path.join(STARTUP_DIR, 'FrostedStickyNotes.vbs');

let mainWindow = null;
let tray = null;
let notesData = [];
let windowState = {
  x: 240,
  y: 140,
  width: 440,
  height: 620,
  isPinned: true,
  mode: 'stack'
};
let saveDebounceTimer = null;

// Load window state (coordinates, dimensions, pin)
function loadWindowState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      windowState = { ...windowState, ...data };
    }
  } catch (err) {
    log('Error reading window state: ' + err);
  }
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getBounds();
    windowState.x = bounds.x;
    windowState.y = bounds.y;
    if (windowState.mode === 'stack') {
      windowState.width = 440;
      windowState.height = 620;
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(windowState, null, 2), 'utf-8');
  } catch (err) {
    log('Error saving window state: ' + err);
  }
}

// Load notes data
function loadNotes() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        notesData = parsed;
        return;
      }
    }
  } catch (err) {
    log('Error reading notes data: ' + err);
  }
  notesData = [
    {
      id: 'note-welcome',
      title: 'Liquid Glass Note',
      content: '<div>Welcome to your <b>liquid glass polymorphic</b> notes!</div><br><div>• <b>Rich Text Formatting</b>: Use <b>Ctrl+B</b> for bold, <u>Ctrl+U</u> for underline.</div><div>• <b>Cross-Desktop Pin</b>: Stays pinned across all virtual desktops.</div><div>• <b>Flipped Stack</b>: Hover over cards to fan headings upwards, click any to pop to front!</div>',
      theme: 'crystal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  saveNotesImmediate();
}

function saveNotesImmediate() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notesData, null, 2), 'utf-8');
  } catch (err) {
    log('Error writing notes: ' + err);
  }
}

function queueSaveNotes() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    saveNotesImmediate();
  }, 300);
}

// Check if startup is configured
function isStartupEnabled() {
  return fs.existsSync(STARTUP_SCRIPT);
}

function setStartupStatus(enable) {
  try {
    if (enable) {
      if (!fs.existsSync(STARTUP_DIR)) {
        fs.mkdirSync(STARTUP_DIR, { recursive: true });
      }
      const vbsContent = [
        'Set WshShell = CreateObject("WScript.Shell")',
        'Set fso = CreateObject("Scripting.FileSystemObject")',
        `strDir = "${__dirname.replace(/\\/g, '\\\\')}"`,
        'WshShell.CurrentDirectory = strDir',
        'strExe = strDir & "\\node_modules\\electron\\dist\\electron.exe"',
        'If fso.FileExists(strExe) Then',
        '    WshShell.Run """" & strExe & """ """ & strDir & """", 0, False',
        'Else',
        '    WshShell.Run "node """ & strDir & "\\node_modules\\electron\\cli.js"" """ & strDir & """", 0, False',
        'End If'
      ].join('\r\n');
      fs.writeFileSync(STARTUP_SCRIPT, vbsContent, 'utf-8');
    } else {
      if (fs.existsSync(STARTUP_SCRIPT)) {
        fs.unlinkSync(STARTUP_SCRIPT);
      }
    }
    updateTrayMenu();
    return true;
  } catch (err) {
    log('Error setting startup: ' + err);
    return false;
  }
}

// Create single persistent liquid glass window
function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return mainWindow;
  }

  loadWindowState();

  let x = windowState.x;
  let y = windowState.y;
  try {
    const primary = screen.getPrimaryDisplay().workArea;
    if (x < primary.x || x > primary.x + primary.width - 250) x = primary.x + 120;
    if (y < primary.y || y > primary.y + primary.height - 250) y = primary.y + 100;
  } catch (e) {
    x = 240;
    y = 140;
  }

  const appIcon = fs.existsSync(ICON_PNG) ? nativeImage.createFromPath(ICON_PNG) : undefined;

  mainWindow = new BrowserWindow({
    width: windowState.mode === 'spread' ? 1180 : (windowState.width || 440),
    height: windowState.mode === 'spread' ? 740 : (windowState.height || 620),
    x: x,
    y: y,
    minWidth: 360,
    minHeight: 440,
    frame: false,
    transparent: true, // Entire outer box is 100% transparent!
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: false,
    alwaysOnTop: windowState.isPinned === true,
    show: false,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      devTools: false,
      backgroundThrottling: true
    }
  });

  // Cross-Desktop & Remote Desktop Pin Persistence
  if (windowState.isPinned === true) {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  } else {
    mainWindow.setVisibleOnAllWorkspaces(false);
    mainWindow.setAlwaysOnTop(false);
  }

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    log('MainWindow ready-to-show');
    mainWindow.show();
    mainWindow.focus();
    if (windowState.isPinned === true) {
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      applyNativePin(true);
    } else {
      mainWindow.setVisibleOnAllWorkspaces(false);
      mainWindow.setAlwaysOnTop(false);
      applyNativePin(false);
    }
  });

  mainWindow.on('moved', () => saveWindowState());
  mainWindow.on('resized', () => saveWindowState());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Setup System Tray
function setupTray() {
  try {
    let icon = null;
    if (fs.existsSync(ICON_PNG)) {
      icon = nativeImage.createFromPath(ICON_PNG).resize({ width: 16, height: 16 });
    }
    if (!icon || icon.isEmpty()) return;

    tray = new Tray(icon);
    tray.setToolTip('Liquid Glass Sticky Notes');

    updateTrayMenu();

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        createMainWindow();
      }
    });
  } catch (err) {
    log('Tray initialization error: ' + err);
  }
}

function updateTrayMenu() {
  if (!tray) return;

  try {
    const contextMenu = Menu.buildFromTemplate([
      { label: '💎 Liquid Glass Sticky Notes', enabled: false },
      { type: 'separator' },
      {
        label: '👁️ Show Notes',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        }
      },
      {
        label: '🙈 Hide Notes',
        click: () => {
          if (mainWindow) mainWindow.hide();
        }
      },
      { type: 'separator' },
      {
        label: '📌 Pin Across All Desktops',
        type: 'checkbox',
        checked: windowState.isPinned !== false,
        click: (menuItem) => {
          setPinAcrossDesktops(menuItem.checked);
        }
      },
      {
        label: '🚀 Launch on Windows Startup',
        type: 'checkbox',
        checked: isStartupEnabled(),
        click: (menuItem) => {
          setStartupStatus(menuItem.checked);
        }
      },
      {
        label: '📄 Open sticky_notes.json',
        click: () => shell.openPath(DATA_FILE)
      },
      {
        label: '📁 Open Notes Folder',
        click: () => shell.openPath(__dirname)
      },
      { type: 'separator' },
      {
        label: '❌ Exit',
        click: () => {
          saveNotesImmediate();
          saveWindowState();
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  } catch (err) {
    log('Error updating tray menu: ' + err);
  }
}

const { execFile } = require('child_process');
const WIN_PIN_EXE = path.join(__dirname, 'win_pin.exe');

function applyNativePin(pinned) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const handle = mainWindow.getNativeWindowHandle();
    const hwnd = (handle.length >= 8 ? handle.readBigInt64LE() : handle.readInt32LE()).toString();
    if (fs.existsSync(WIN_PIN_EXE)) {
      execFile(WIN_PIN_EXE, [hwnd, pinned ? '1' : '0'], (err, stdout) => {
        if (err) log('win_pin error: ' + err);
        else log('win_pin applied: ' + stdout.trim());
      });
    }
  } catch (err) {
    log('applyNativePin error: ' + err);
  }
}

// Pin functionality across all virtual desktops & remote sessions
function setPinAcrossDesktops(pinned) {
  windowState.isPinned = pinned;
  saveWindowState();
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (pinned) {
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    } else {
      mainWindow.setVisibleOnAllWorkspaces(false);
      mainWindow.setAlwaysOnTop(false);
    }
    applyNativePin(pinned);
  }
  updateTrayMenu();
}

// Register IPC handlers
function registerIpc() {
  ipcMain.handle('get-all-notes', () => {
    return notesData;
  });

  ipcMain.handle('get-window-state', () => {
    return windowState;
  });

  ipcMain.handle('save-all-notes', (event, updatedNotes) => {
    notesData = updatedNotes;
    queueSaveNotes();
    return { success: true };
  });

  ipcMain.handle('set-window-mode', (event, mode) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    windowState.mode = mode;
    saveWindowState();
    if (mode === 'spread') {
      mainWindow.setSize(1180, 740, true);
    } else if (mode === 'settings') {
      mainWindow.setSize(880, 620, true);
    } else {
      mainWindow.setSize(440, 620, true);
    }
  });

  ipcMain.handle('toggle-pin', (event, pinState) => {
    const target = typeof pinState === 'boolean' ? pinState : !windowState.isPinned;
    setPinAcrossDesktops(target);
    return windowState.isPinned;
  });

  ipcMain.handle('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.hide();
    }
  });

  ipcMain.handle('open-folder', () => {
    shell.openPath(__dirname);
  });

  ipcMain.handle('open-json', () => {
    shell.openPath(DATA_FILE);
  });

  ipcMain.handle('log-issue', (event, level, message, stack) => {
    writeToLog(level || 'ERROR', 'RENDERER', message, stack);
    return true;
  });
}

// Single instance lock
log('Requesting single instance lock...');
const gotTheLock = app.requestSingleInstanceLock();
log('gotTheLock = ' + gotTheLock);

if (!gotTheLock) {
  log('Did not get lock, focusing existing window and quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    log('Second instance triggered -> focusing mainWindow');
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.setAlwaysOnTop(true);
      mainWindow.focus();
      if (windowState.isPinned) {
        mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      } else {
        mainWindow.setAlwaysOnTop(false);
      }
    } else {
      createMainWindow();
    }
  });

  app.whenReady().then(() => {
    log('app.whenReady resolved');
    loadWindowState();
    loadNotes();
    registerIpc();
    setupTray();

    try {
      if (!isStartupEnabled()) {
        setStartupStatus(true);
      }
    } catch (err) {
      log('Startup setup error: ' + err);
    }

    createMainWindow();

    app.on('activate', () => {
      if (!mainWindow) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    // Keep running in tray
  });

  app.on('before-quit', () => {
    saveNotesImmediate();
    saveWindowState();
  });
}
