import * as Toast from "@radix-ui/react-toast";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToastVariant = "default" | "success" | "error" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  default: (title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const createId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = createId();
      setItems((prev) => [...prev, { id, title, description, variant }]);
    },
    [],
  );

  const api = useMemo<ToastContextValue>(
    () => ({
      default: (title, description) => push("default", title, description),
      success: (title, description) => push("success", title, description),
      warning: (title, description) => push("warning", title, description),
      error: (title, description) => push("error", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      <Toast.Provider swipeDirection="right">
        {children}

        {items.map((toast) => (
          <Toast.Root
            key={toast.id}
            className={
              "pointer-events-auto w-full max-w-sm rounded-xl border bg-white p-4 shadow-lg " +
              (toast.variant === "success"
                ? "border-green-200"
                : toast.variant === "warning"
                  ? "border-yellow-200"
                  : toast.variant === "error"
                    ? "border-red-200"
                    : "border-gray-200")
            }
            duration={2000}
            onOpenChange={(open) => {
              if (!open)
                setItems((prev) => prev.filter((t) => t.id !== toast.id));
            }}
          >
            <Toast.Title
              className={
                "text-sm font-semibold " +
                (toast.variant === "success"
                  ? "text-green-800"
                  : toast.variant === "warning"
                    ? "text-yellow-800"
                    : toast.variant === "error"
                      ? "text-red-800"
                      : "text-gray-900")
              }
            >
              {toast.title}
            </Toast.Title>
            {toast.description && (
              <Toast.Description className="mt-1 text-sm text-gray-600">
                {toast.description}
              </Toast.Description>
            )}
          </Toast.Root>
        ))}

        <Toast.Viewport className="fixed right-4 top-4 z-[100] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
