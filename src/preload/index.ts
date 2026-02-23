import { contextBridge, ipcRenderer } from 'electron';
import type { ThreeSendApi } from './types';

const api: ThreeSendApi = {
  identity: {
    getAddress: () => ipcRenderer.invoke('identity:getAddress') as Promise<{ address: string }>,
    signMessage: (input) =>
      ipcRenderer.invoke('identity:signMessage', input) as Promise<{ signature: `0x${string}` }>,
  },
};

contextBridge.exposeInMainWorld('threeSend', api);
