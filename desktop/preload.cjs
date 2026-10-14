const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("zhixuDesktop", {
  chooseDirectory: () => ipcRenderer.invoke("zhixu:choose-directory"),
  showFile: (id) => ipcRenderer.invoke("zhixu:show-file", id),
  showDataDirectory: () => ipcRenderer.invoke("zhixu:show-data-directory"),
  getAppearance: () => ipcRenderer.invoke("zhixu:get-appearance"),
  setTheme: (theme) => ipcRenderer.invoke("zhixu:set-theme", theme),
  setPreferences: (value) => ipcRenderer.invoke("zhixu:set-preferences", value),
  onAppearanceChanged: (callback) => {
    const listener = (_event, appearance) => callback(appearance);
    ipcRenderer.on("zhixu:appearance-changed", listener);
    return () =>
      ipcRenderer.removeListener("zhixu:appearance-changed", listener);
  },
});
