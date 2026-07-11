import { Toaster } from "sonner";
import { AuthProvider } from "./features/auth/AuthContext";
import { FeaturesDashboard } from "./features/features/FeaturesDashboard";

export default function App() {
  return (
    <AuthProvider>
      <FeaturesDashboard />
      <Toaster
        position="top-right"
        closeButton
        richColors
        toastOptions={{
          classNames: {
            toast: "rounded border border-zinc-200 bg-white text-zinc-950 shadow-lg",
            title: "text-sm font-semibold text-zinc-950",
            description: "text-sm text-zinc-500",
            closeButton: "toast-close-button",
            actionButton: "rounded bg-zinc-950 px-3 py-1.5 text-sm font-medium text-white",
            cancelButton: "rounded border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700",
          },
        }}
      />
    </AuthProvider>
  );
}
