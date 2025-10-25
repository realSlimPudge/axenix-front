"use client";
import { HTMLAttributes, ReactNode } from "react";

interface VideoContainerProps extends HTMLAttributes<HTMLDivElement> {
  aspectRatio?: "video" | "square" | "auto";
  children: ReactNode;
}

export function VideoContainer({
  aspectRatio = "video",
  className = "",
  children,
  ...props
}: VideoContainerProps) {
  const aspectRatios = {
    video: "aspect-video",
    square: "aspect-square",
    auto: "aspect-auto",
  };

  const baseStyles =
    "rounded-lg overflow-hidden relative bg-gray-800 border-2 border-gray-700";

  return (
    <div
      className={`${baseStyles} ${aspectRatios[aspectRatio]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
