"use client";
import { useRouter } from "next/navigation";
import { Button } from "./Button";
import { ArrowLeft } from "lucide-react";

export interface BackProps {
    label?: string;
}

export default function Back({ label = "Назад" }: BackProps) {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="glass-button text-slate-400"
        >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
        </Button>
    );
}
