/* eslint global-require: off, no-console: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

log.info(process.versions);

let mainWindow: BrowserWindow | null = null;
let opencvWorkerWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    webPreferences:
      process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
        ? {
            nodeIntegration: true
          }
        : {
            preload: path.join(__dirname, 'dist/renderer.prod.js')
          }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // opencvWorkerWindow
  opencvWorkerWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    }
  });
  opencvWorkerWindow.hide();
  // opencvWorkerWindow.webContents.openDevTools();
  opencvWorkerWindow.loadURL(`file://${__dirname}/worker_opencv.html`);

  opencvWorkerWindow.on('close', event => {
    // only hide window and prevent default if app not quitting
    if (opencvWorkerWindow !== null) {
      opencvWorkerWindow.hide();
    }
    event.preventDefault();
  });

  opencvWorkerWindow.webContents.on('did-finish-load', () => {
    if (!opencvWorkerWindow) {
      throw new Error('"opencvWorkerWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      opencvWorkerWindow.minimize();
    } else {
      opencvWorkerWindow.show();
      opencvWorkerWindow.focus();
    }
  });

  opencvWorkerWindow.on('closed', () => {
    opencvWorkerWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow, opencvWorkerWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

// ipcMain.handle('some-name', async (_, someArgument) => {
//   const result = await doSomeWork(someArgument);
//   return result;
// });

ipcMain.on(
  'message-from-mainWindow-to-opencvWorkerWindow',
  (_, ipcName, ...args) => {
    log.debug(
      `mainThread | passing ${ipcName} from mainWindow to opencvWorkerWindow`
    );
    // log.debug(...args);
    if (opencvWorkerWindow !== null) {
      opencvWorkerWindow.webContents.send(ipcName, ...args);
    }
  }
);

ipcMain.on(
  'message-from-opencvWorkerWindow-to-mainWindow',
  (_, ipcName, ...args) => {
    log.debug(
      `mainThread | passing ${ipcName} from opencvWorkerWindow to mainWindow`
    );
    // log.debug(...args);
    if (mainWindow !== null) {
      mainWindow.webContents.send(ipcName, ...args);
    }
  }
);
