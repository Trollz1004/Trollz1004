import { AsyncLocalStorage } from 'async_hooks';

interface RequestContextStore {
  requestId: string;
}

const storage = new AsyncLocalStorage<RequestContextStore>();

export const runWithRequestContext = <T>(requestId: string, callback: () => T): T => {
  return storage.run({ requestId }, callback);
};

export const getRequestId = (): string | undefined => {
  return storage.getStore()?.requestId;
};
