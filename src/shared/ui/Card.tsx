"use client";
import { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  children: ReactNode;
}

export function Card({
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  const variants = {
    default: "bg-white border border-gray-200",
    elevated: "bg-white shadow-md border border-gray-100",
    outlined: "border-2 border-gray-200",
  };

  const baseStyles = "rounded-lg p-6";

  return (
    <div
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
