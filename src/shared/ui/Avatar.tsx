"use client";
import { HTMLAttributes } from "react";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
  status?: "online" | "offline" | "busy" | "away";
}

export function Avatar({
  src,
  alt,
  size = "md",
  fallback,
  status,
  className = "",
  ...props
}: AvatarProps) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-24 h-24",
  };

  const statusColors = {
    online: "bg-success-500",
    offline: "bg-gray-400",
    busy: "bg-error-500",
    away: "bg-warning-500",
  };

  return (
    <div
      className={`relative inline-block ${sizes[size]} ${className}`}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="rounded-full object-cover w-full h-full"
        />
      ) : (
        <div className="bg-primary-100 text-primary-600 rounded-full w-full h-full flex items-center justify-center font-medium text-sm">
          {fallback}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white w-3 h-3 ${statusColors[status]}`}
        />
      )}
    </div>
  );
}
