"use client";
import { ReactNode } from "react";

interface ModalBodyProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function ModalBody({
  children,
  className = "",
  padding = "md",
}: ModalBodyProps) {
  const paddingClasses = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={`${paddingClasses[padding]} ${className}`}>{children}</div>
  );
}
