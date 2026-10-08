const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('zhixuDesktop',{chooseDirectory:()=>ipcRenderer.invoke('zhixu:choose-directory'),showFile:id=>ipcRenderer.invoke('zhixu:show-file',id),showDataDirectory:()=>ipcRenderer.invoke('zhixu:show-data-directory')});
