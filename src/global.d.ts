import type { ThreeSendApi } from './preload/types';

declare global {
  interface Window {
    threeSend: ThreeSendApi;
  }
}

export {};
