import { createContext, useContext } from "react";

const AutosaveContext = createContext<{
  addPendingSaver: (id: string) => void;
  removePendingSaver: (id: string) => void;
  setPendingSaverError: (id: string, e?: any) => void;
}>({
  addPendingSaver: () => {},
  removePendingSaver: () => {},
  setPendingSaverError: () => {},
});

export default AutosaveContext;

export const useAutosaveContext = () => useContext(AutosaveContext);
