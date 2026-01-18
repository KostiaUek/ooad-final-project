import { app, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, closeDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { registerIpcHandlers } from './ipc/handlers';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Get the correct icon path
const getIconPath = () => {
  if (isDev) {
    // In dev, __dirname is dist-electron, so go up one level to project root
    return path.join(__dirname, '..', 'public', 'icon.ico');
  }
  // In production, icon is in resources or same level as app
  return path.join(__dirname, '..', 'dist', 'icon.ico');
};

function createWindow() {
  const iconPath = getIconPath();
  console.log('Icon path:', iconPath);
  console.log('Icon exists:', fs.existsSync(iconPath));
  
  // Load icon using nativeImage for proper Windows support
  let appIcon;
  try {
    appIcon = nativeImage.createFromPath(iconPath);
    console.log('Icon size:', appIcon.getSize());
    if (appIcon.isEmpty()) {
      console.log('Warning: Icon loaded but is empty');
    }
  } catch (err) {
    console.error('Failed to load icon:', err);
  }
  
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Required for better-sqlite3
    },
    icon: appIcon || iconPath,
    title: 'Home Library Manager',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app
app.whenReady().then(async () => {
  try {
    // Initialize database
    console.log('Initializing database...');
    initDatabase();
    
    // Run migrations
    console.log('Running migrations...');
    runMigrations();
    
    // Register IPC handlers
    console.log('Registering IPC handlers...');
    registerIpcHandlers();
    
    // Create window
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to initialize app:', error);
    dialog.showErrorBox('Initialization Error', `Failed to initialize the application: ${error}`);
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  closeDatabase();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
});
