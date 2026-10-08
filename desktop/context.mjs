import {AsyncLocalStorage} from 'node:async_hooks';
export const requestContext=new AsyncLocalStorage();
export async function getChatGPTUser(){return requestContext.getStore()?.user||null}
