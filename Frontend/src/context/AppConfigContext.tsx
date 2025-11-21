import { createContext, useContext } from "react";

export type AppConfig = {
  googleClientId?: string | null;
};

export const AppConfigContext = createContext<AppConfig>({});

export function useAppConfig() {
  return useContext(AppConfigContext);
}

