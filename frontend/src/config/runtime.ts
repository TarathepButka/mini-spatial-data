export const appConfig = {
  apiBaseUrl: (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, ""),
  googleClientID: (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim(),
};
