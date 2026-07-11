import { LogIn, MapPinned } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { appConfig } from "../../config/runtime";
import { useAuth } from "./AuthContext";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
            ux_mode?: "popup" | "redirect";
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              shape?: "rectangular" | "pill" | "circle" | "square";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: number;
            },
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const googleClientID = appConfig.googleClientID;

export function LoginScreen({ loading }: { loading: boolean }) {
  const { loginWithGoogle, continueLocalDemo } = useAuth();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!googleClientID) return;
    if (window.google?.accounts.id) {
      setScriptReady(true);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError("Unable to load Google Identity Services.");
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!googleClientID || !scriptReady || !buttonRef.current || !window.google?.accounts.id) return;
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.initialize({
      client_id: googleClientID,
      ux_mode: "popup",
      callback: (response) => {
        if (!response.credential) {
          setError("Google did not return an ID token.");
          return;
        }
        loginWithGoogle(response.credential).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Google login failed.");
        });
      },
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "signin_with",
      width: 320,
    });
  }, [loginWithGoogle, scriptReady]);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 px-4 text-zinc-950">
      <section className="w-full max-w-md rounded border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded bg-zinc-950 text-white">
            <MapPinned size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Mini Spatial Data Platform</h1>
            <p className="mt-1 text-sm text-zinc-500">Sign in with Google to manage spatial records.</p>
          </div>
        </div>

        {googleClientID ? (
          <div className="grid gap-3">
            <div ref={buttonRef} className="min-h-11" />
            {(loading || (googleClientID && !scriptReady)) && <p className="text-sm text-zinc-500">Preparing Google login</p>}
          </div>
        ) : (
          <div className="grid gap-4 rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p>Set `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` to enable Google login.</p>
            <button
              type="button"
              onClick={continueLocalDemo}
              className="inline-flex h-10 items-center justify-center gap-2 rounded bg-zinc-950 px-4 font-semibold text-white"
            >
              <LogIn size={17} />
              Continue local demo
            </button>
          </div>
        )}

        {error && <div className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </section>
    </main>
  );
}
