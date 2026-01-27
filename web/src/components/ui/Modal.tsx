import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import Button from "./Button";

type Size = "small" | "medium" | "large" | "extra-large";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  size?: Size;
  confirmDisabled?: boolean;
  maxWidthClassName?: string;
  labelledById?: string;
}

function getSizeClassName(size: Size = "medium"): string {
  switch (size) {
    case "small":
      return "max-w-sm";
    case "medium":
      return "max-w-md";
    case "large":
      return "max-w-2xl";
    case "extra-large":
      return "max-w-4xl";
    default:
      return "max-w-md";
  }
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = "确定",
  cancelText = "取消",
  confirmVariant = "primary",
  size = "medium",
  confirmDisabled = false,
  maxWidthClassName,
  labelledById,
}: ModalProps) {
  const sizeClassName = maxWidthClassName || getSizeClassName(size);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousActive = document.activeElement as HTMLElement | null;
    const focusable = containerRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = labelledById || "modal-title";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative bg-white rounded-lg shadow-lg ${sizeClassName} w-full mx-4 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 id={titleId} className="text-lg font-semibold">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="关闭弹窗"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {onConfirm && (
          <div className="flex items-center justify-end gap-3 p-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={
                confirmVariant === "danger"
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : ""
              }
            >
              {confirmText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
