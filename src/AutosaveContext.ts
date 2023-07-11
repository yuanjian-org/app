import { AutosaveState } from "components/AutosaveIndicator";
import { createContext, useContext } from "react";

const AutosaveContext = createContext<{
  addPendingSaver: (id: string) => void, 
  removePendingSaver: (id: string) => void,
}>({
  addPendingSaver: () => {}, 
  removePendingSaver: () => {},
});

export default AutosaveContext;

export const useAutosaveContext = () => useContext(AutosaveContext);
