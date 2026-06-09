const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("updater", {
  check: () => ipcRenderer.invoke("check-for-updates"),
  installNow: () => ipcRenderer.invoke("install-now"),
  getInfo: () => ipcRenderer.invoke("get-info"),
  onStatus: (cb) => {
    const listener = (_event, payload) => cb(payload);
    ipcRenderer.on("update-status", listener);
    return () => ipcRenderer.removeListener("update-status", listener);
  },
});
