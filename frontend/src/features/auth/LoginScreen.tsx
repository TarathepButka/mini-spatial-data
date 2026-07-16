
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
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(320);

  useEffect(() => {
    if (!buttonRef.current) {
      return;
    }

    const updateButtonWidth = () => {
      if (!buttonRef.current) {
        return;
      }

      const nextWidth = Math.floor(
        buttonRef.current.getBoundingClientRect().width,
      );
      setButtonWidth(Math.min(360, Math.max(200, nextWidth)));
    };

    updateButtonWidth();

    const observer = new ResizeObserver(updateButtonWidth);
    observer.observe(buttonRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!googleClientID) {
      return;
    }

    if (window.google?.accounts.id) {
      setScriptReady(true);

      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-google-identity]",
    );
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true), {
        once: true,
      });

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
    if (
      !googleClientID ||
      !scriptReady ||
      !buttonRef.current ||
      !window.google?.accounts.id
    ) {
      return;
    }

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
      width: buttonWidth,
    });
  }, [buttonWidth, loginWithGoogle, scriptReady]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-110 rounded-md border border-zinc-200 bg-white px-6 py-7 shadow-xl sm:px-8 sm:py-8">
        <div className="mx-auto grid w-full max-w-90 gap-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png?v=3" alt="Logo" className="h-12 w-12 object-contain" />
            <div className="min-w-0">
              <h1 className="text-[21px] font-semibold leading-tight">
                Mini Spatial Data
              </h1>
            </div>
          </div>

          {googleClientID ? (
            <div className="grid gap-3">
              <div ref={buttonRef} className="min-h-11 w-full" />
              {(loading || (googleClientID && !scriptReady)) && (
                <p className="text-sm text-zinc-500">Preparing Google login</p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p>Set up environment variable to enable Google login.</p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
