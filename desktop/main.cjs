const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  safeStorage,
  nativeTheme,
  systemPreferences,
  screen,
} = require("electron");
const os = require("node:os");
const fs = require("node:fs/promises"),
  path = require("node:path"),
  crypto = require("node:crypto");
app.setName("知序");
let service,
  preferences,
  window,
  closing = false;
const windows = process.platform === "win32",
  mica = windows && Number(os.release().split(".")[2]) >= 22621;
function appearance() {
  return {
    accent: windows ? systemPreferences.getAccentColor().slice(0, 6) : null,
    material:
      mica &&
      !nativeTheme.shouldUseHighContrastColors &&
      !nativeTheme.prefersReducedTransparency,
    titlebar: windows,
    preferences: preferences?.get(),
  };
}
function updateAppearance() {
  if (!window || window.isDestroyed()) return;
  const dark = nativeTheme.shouldUseDarkColors;
  const material = appearance().material;
  if (mica) window.setBackgroundMaterial(material ? "mica" : "none");
  window.setBackgroundColor(
    material ? "#00000000" : dark ? "#202020" : "#f3f3f3",
  );
  if (windows)
    window.setTitleBarOverlay({
      color: dark ? "#202020" : "#f3f3f3",
      symbolColor: dark ? "#f5f5f5" : "#1a1a1a",
      height: 40,
    });
  window.webContents.send("zhixu:appearance-changed", appearance());
}
nativeTheme.on("updated", updateAppearance);
if (windows) systemPreferences.on("accent-color-changed", updateAppearance);
const smoke = process.argv.includes("--smoke-test"),
  smokeArg = process.argv.find((x) => x.startsWith("--smoke-dir="));
if (smokeArg) app.setPath("userData", smokeArg.slice("--smoke-dir=".length));
if (!app.requestSingleInstanceLock()) app.quit();
else
  app.on("second-instance", () => {
    if (window?.isMinimized()) window.restore();
    window?.show();
    window?.focus();
  });
async function secret(dataDir) {
  const location = path.join(dataDir, "secret.enc");
  await fs.mkdir(dataDir, { recursive: true });
  if (!safeStorage.isEncryptionAvailable())
    throw new Error("系统凭据加密不可用，无法保存本地 AI 密钥。");
  try {
    return safeStorage.decryptString(await fs.readFile(location));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
    const key = crypto.randomBytes(32).toString("base64url");
    await fs.writeFile(location, safeStorage.encryptString(key), {
      mode: 0o600,
    });
    return key;
  }
}
function trusted(event) {
  if (
    event.sender !== window?.webContents ||
    !event.senderFrame?.url.startsWith(service.origin + "/")
  )
    throw new Error("不允许的桌面调用");
}
app.whenReady().then(async () => {
  try {
    const { startService } = await import("./out/service.mjs");
    const dataDir = app.getPath("userData");
    preferences = await require("./preferences.cjs").createPreferences(dataDir);
    nativeTheme.themeSource = preferences.get().theme;
    service = await startService({
      dataDir,
      secret: await secret(dataDir),
      migrations: path.join(__dirname, "out/migrations"),
      renderer: path.join(__dirname, "out/renderer"),
    });
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    window = new BrowserWindow({
      title: "知序 · 本地学习工作台",
      width: Math.min(1380, workArea.width),
      height: Math.min(900, workArea.height),
      minWidth: Math.min(760, workArea.width),
      minHeight: Math.min(600, workArea.height),
      show: false,
      backgroundColor: nativeTheme.shouldUseDarkColors ? "#202020" : "#f3f3f3",
      ...(windows
        ? {
            titleBarStyle: "hidden",
            titleBarOverlay: {
              color: nativeTheme.shouldUseDarkColors ? "#202020" : "#f3f3f3",
              symbolColor: nativeTheme.shouldUseDarkColors
                ? "#f5f5f5"
                : "#1a1a1a",
              height: 40,
            },
          }
        : {}),
      ...(mica ? { backgroundMaterial: "mica" } : {}),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    updateAppearance();
    window.once("ready-to-show", () => {
      if (!smoke) window.show();
    });
    ipcMain.handle("zhixu:set-preferences", (event, value) => {
      trusted(event);
      if (
        !value ||
        !["system", "light", "dark"].includes(value.theme) ||
        typeof value.reduce !== "boolean" ||
        typeof value.systemAccent !== "boolean"
      )
        throw new Error("外观设置不正确");
      return preferences.save(value);
    });
    ipcMain.handle("zhixu:get-appearance", (event) => {
      trusted(event);
      return appearance();
    });
    ipcMain.handle("zhixu:set-theme", (event, theme) => {
      trusted(event);
      if (!["system", "light", "dark"].includes(theme))
        throw new Error("主题不正确");
      if (nativeTheme.themeSource !== theme) {
        nativeTheme.themeSource = theme;
        updateAppearance();
      }
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-prevent-unload", (event) => {
      const discard = dialog.showMessageBoxSync(window, {
        type: "question",
        title: "保留未保存的修改",
        message: "当前笔记还有未保存的修改。",
        detail: "返回工作台保存，或放弃修改并关闭窗口。",
        buttons: ["返回编辑", "放弃修改并关闭"],
        defaultId: 0,
        cancelId: 0,
      });
      if (discard === 1) event.preventDefault();
    });
    window.webContents.on("will-navigate", (event, url) => {
      if (!url.startsWith(service.origin + "/")) event.preventDefault();
    });
    window.webContents.session.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    ipcMain.handle("zhixu:choose-directory", async (event) => {
      trusted(event);
      const selected = await dialog.showOpenDialog(window, {
        title: "选择要建立索引的目录（不会移动文件）",
        properties: ["openDirectory"],
      });
      return selected.canceled
        ? null
        : {
            grant: service.indexer.grantRootPath(selected.filePaths[0]),
            path: selected.filePaths[0],
          };
    });
    ipcMain.handle("zhixu:show-file", async (event, id) => {
      trusted(event);
      if (typeof id !== "string" || id.length > 100)
        throw new Error("文件 ID 不正确");
      const cookies = await window.webContents.session.cookies.get({
        url: service.origin,
      });
      const cookie = cookies.map((c) => c.name + "=" + c.value).join("; ");
      const location = await service.fileLocation(id, cookie);
      shell.showItemInFolder(location);
      return true;
    });
    ipcMain.handle("zhixu:show-data-directory", async (event) => {
      trusted(event);
      await shell.openPath(dataDir);
    });
    await window.loadURL(service.origin);
    if (smoke) {
      const result = await window.webContents.executeJavaScript(
        `(async()=>{const s=await (await fetch('/local/auth/status')).json();const response=await fetch('/local/auth/'+(s.setupRequired?'setup':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'windows-smoke',password:'smoke-password-123'})});if(!response.ok)throw new Error('Local login failed');const data=await (await fetch('/api/workspace?action=bootstrap')).json();if(!data.space)throw new Error('Local database failed');return {ok:true,title:document.title,space:data.space,nodeIntegration:typeof require==='undefined'}})()`,
      );
      await window.loadURL(service.origin);
      await window.webContents.executeJavaScript(
        `new Promise((resolve,reject)=>{let tries=0;const timer=setInterval(()=>{if(document.body.innerText.includes('今天想学什么')){clearInterval(timer);resolve(true)}else if(++tries>100){clearInterval(timer);reject(new Error('Workspace did not render'))}},100)})`,
      );
      if (!result.nodeIntegration) throw new Error("Renderer isolation failed");
      await fs.writeFile(
        path.join(dataDir, "smoke-result.json"),
        JSON.stringify(result),
      );
      await service.close();
      service = null;
      app.exit(0);
    }
  } catch (e) {
    if (smoke) {
      await fs.mkdir(app.getPath("userData"), { recursive: true });
      await fs.writeFile(
        path.join(app.getPath("userData"), "smoke-error.txt"),
        String(e.stack || e),
      );
      app.exit(1);
    } else {
      dialog.showErrorBox("知序启动失败", e.message);
      app.quit();
    }
  }
});
app.on("window-all-closed", () => app.quit());
app.on("before-quit", (event) => {
  if (service && !closing) {
    event.preventDefault();
    closing = true;
    Promise.all([service.close(), preferences?.flush()]).finally(() => {
      service = null;
      app.quit();
    });
  }
});
