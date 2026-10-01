import { createContext, useContext } from 'react';
import type { DataRecord } from './api';
export type ConsoleContext = { appId: string; appName: string; language: string; t: (zh: string, en?: string) => string; setLanguage: (lang: string) => void; setApp: (app: DataRecord) => void; user: DataRecord | null; refreshSession: () => Promise<void>; logout: () => void };
export const Context = createContext<ConsoleContext>(null!);
export const useConsole = () => useContext(Context);
