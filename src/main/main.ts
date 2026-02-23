import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAddress, signMessage } from './identity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    title: '3sendxyz App',
    webPreferences: {
      preload: path.join(__dirname, 'index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  if (DEV_SERVER_URL) {
    win.loadURL(DEV_SERVER_URL).catch(() => {});
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    win.loadFile(indexPath).catch(() => {});
  }

  return win;
}

function registerIpcHandlers() {
  ipcMain.handle('identity:getAddress', async () => {
    const address = await getAddress();
    return { address };
  });

  ipcMain.handle('identity:signMessage', async (_event, payload: { message?: string }) => {
    const message = typeof payload?.message === 'string' ? payload.message : '';
    if (!message.trim()) {
      throw new Error('Cannot sign an empty message.');
    }
    const signature = await signMessage(message);
    return { signature };
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
