type RuntimeConfig = {
  VITE_API_URL?: string;
  VITE_GOOGLE_CLIENT_ID?: string;
};

declare global {
  interface Window {
    __MINI_SPATIAL_CONFIG__?: RuntimeConfig;
  }
}

function readConfigValue(key: keyof RuntimeConfig) {
  const runtimeValue =
    typeof window !== "undefined"
      ? window.__MINI_SPATIAL_CONFIG__?.[key]
      : undefined;
  const buildValue = import.meta.env[key] as string | undefined;
  return (runtimeValue || buildValue || "").trim();
}

export const appConfig = {
  apiBaseUrl: readConfigValue("VITE_API_URL").replace(/\/$/, ""),
  googleClientID: readConfigValue("VITE_GOOGLE_CLIENT_ID"),
};
