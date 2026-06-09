const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const path = require("path");

log.transports.file.level = "info";
log.transports.console.level = "info";
log.info(
  `[boot] SquadIA POC v${app.getVersion()} starting on ${process.platform}`,
);

autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;

let mainWindow = null;
let pendingUpdateInfo = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 560,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#0b1020",
    title: "SquadIA POC — Auto Update",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function sendStatus(status, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("update-status", {
      status,
      data,
      version: app.getVersion(),
      platform: process.platform,
      timestamp: Date.now(),
    });
  }
}

autoUpdater.on("checking-for-update", () => {
  log.info("[updater] checking for update");
  sendStatus("checking");
});

autoUpdater.on("update-available", (info) => {
  log.info("[updater] update available", info?.version);
  pendingUpdateInfo = info;
  sendStatus("available", {
    version: info?.version,
    releaseDate: info?.releaseDate,
  });
});

autoUpdater.on("update-not-available", (info) => {
  log.info("[updater] up to date", info?.version);
  sendStatus("none", { version: info?.version });
});

autoUpdater.on("error", (err) => {
  log.error("[updater] error", err);
  sendStatus("error", { message: err?.message || String(err) });
});

autoUpdater.on("download-progress", (p) => {
  sendStatus("downloading", {
    percent: Math.round(p.percent || 0),
    bytesPerSecond: p.bytesPerSecond,
    transferred: p.transferred,
    total: p.total,
  });
});

autoUpdater.on("update-downloaded", async (info) => {
  log.info("[updater] update downloaded", info?.version);
  pendingUpdateInfo = info;
  sendStatus("downloaded", { version: info?.version });

  const result = await dialog.showMessageBox(mainWindow, {
    type: "info",
    buttons: ["Reiniciar agora", "Depois"],
    defaultId: 0,
    cancelId: 1,
    title: "Atualização disponível",
    message: `SquadIA POC v${info?.version} foi baixada com sucesso.`,
    detail:
      'Reiniciar agora aplica a atualização imediatamente. Se escolher "Depois", a atualização será aplicada quando o app for fechado.',
  });

  if (result.response === 0) {
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
  }
});

ipcMain.handle("check-for-updates", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo?.version };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
});

ipcMain.handle("get-info", () => ({
  version: app.getVersion(),
  platform: process.platform,
  arch: process.arch,
  electron: process.versions.electron,
  node: process.versions.node,
  chrome: process.versions.chrome,
  pendingUpdate: pendingUpdateInfo?.version || null,
}));

ipcMain.handle("install-now", () => {
  if (pendingUpdateInfo) {
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return { ok: true };
  }
  return { ok: false, error: "No update downloaded" };
});

app.whenReady().then(() => {
  createWindow();

  autoUpdater
    .checkForUpdatesAndNotify()
    .catch((err) => log.error("[updater] initial check failed", err));

  setInterval(
    () => {
      autoUpdater
        .checkForUpdates()
        .catch((err) => log.error("[updater] periodic check failed", err));
    },
    30 * 60 * 1000,
  );
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
