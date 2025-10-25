"use client";
import {
  useEffect,
  useRef,
  ReactNode,
  MouseEvent,
  KeyboardEvent,
  useCallback,
} from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = "",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Блокировка скролла на body при открытии модалки
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      // Возвращаем фокус на предыдущий активный элемент
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Обработка нажатия Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  // Обработка клика на оверлей
  const handleOverlayClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  // Фокус на модалке при открытии
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    fullscreen: "max-w-full max-h-full m-4",
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      onKeyDown={handleKeyDown}
      onClick={handleOverlayClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        ref={modalRef}
        className={`
          relative bg-white rounded-xl shadow-2xl w-full
          ${sizeClasses[size]}
          ${size === "fullscreen" ? "h-[calc(100vh-2rem)]" : "max-h-[90vh]"}
          transform transition-all duration-200
          ${className}
        `}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold text-gray-900"
              >
                {title}
              </h2>
            )}

            {showCloseButton && (
              <button
                onClick={onClose}
                className={`
                  p-2 rounded-lg transition-colors
                  hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${title ? "" : "ml-auto"}
                `}
                aria-label="Close modal"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          className={`
            overflow-auto
            ${size === "fullscreen" ? "h-[calc(100%-80px)]" : "max-h-[calc(90vh-80px)]"}
            ${!title && !showCloseButton ? "rounded-xl" : ""}
          `}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
