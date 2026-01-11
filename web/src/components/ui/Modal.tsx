import { ReactNode } from "react";
import { X } from "lucide-react";
import Button from "./Button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = "确定",
  cancelText = "取消",
  confirmVariant = "primary"
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
        {onConfirm && (
          <div className="flex items-center justify-end gap-3 p-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {cancelText}
            </Button>
            <Button 
              onClick={onConfirm}
              className={confirmVariant === "danger" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
            >
              {confirmText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
