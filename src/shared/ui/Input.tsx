"use client";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "error" | "success";
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", label, error, className = "", ...props }, ref) => {
    const variants = {
      default:
        "border-gray-300 focus:border-primary-500 focus:ring-primary-500",
      error: "border-error-300 focus:border-error-500 focus:ring-error-500",
      success:
        "border-success-300 focus:border-success-500 focus:ring-success-500",
    };

    const baseStyles =
      "block w-full rounded-default border px-3 py-2 placeholder-gray-400 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-gray-50 disabled:text-gray-500";

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${variants[variant]} ${error ? "border-error-300 focus:border-error-500 focus:ring-error-500" : ""} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-error-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
