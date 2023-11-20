import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getClientConfig, DEFAULT_API_HOST, DEFAULT_MODELS, StoreKey } from "./shared";
import { v4 } from "uuid";

export interface AccessControlStore {
  isLoggedIn: boolean;
  openAiApiKey: string;
  localProxy: string;

  installation: string;
  hideUserApiKey: boolean;
  hideBalanceQuery: boolean;
  disableGPT4: boolean;

  openaiUrl: string;
  getOpenaiUrl: () => string;

  updateOpenAiApiKey: (_: string) => void;
  updateLocalProxy: (_: string) => void;
  updateLoggedIn: (_: boolean) => void;
  updateOpenAiUrl: (_: string) => void;
  isAuthorized: () => boolean;
}

const DEFAULT_OPENAI_URL =
  getClientConfig()?.buildMode === "export" ? DEFAULT_API_HOST : "/api/openai/";
console.log("[API] default openai url", DEFAULT_OPENAI_URL);

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      openAiApiKey: "",
      localProxy: "",

      // actual logged in status from remote server
      // this is redundant for convenience
      // the actual token stays in the cookie
      isLoggedIn: false,

      hideUserApiKey: false,
      hideBalanceQuery: false,
      disableGPT4: false,

      installation: v4(),

      openaiUrl: DEFAULT_OPENAI_URL,
      getOpenaiUrl: () => {
        if (get().openAiApiKey) {
          return "/api/openai/";
        }

        return "/api/openai";
      },
      updateLoggedIn(v: boolean) {
        set(() => ({ isLoggedIn: v }));
      },
      updateOpenAiApiKey(token: string) {
        set(() => ({ openAiApiKey: token?.trim() }));
      },
      updateLocalProxy(p: string) {
        set(() => ({ localProxy: p?.trim() }));
      },
      updateOpenAiUrl(url: string) {
        set(() => ({ openaiUrl: url?.trim() }));
      },
      isAuthorized() {
        return true;
        return (
          !!get().openAiApiKey || get().isLoggedIn
        );
      },
    }),
    {
      name: StoreKey.Access,
      version: 1,
    },
  ),
);
