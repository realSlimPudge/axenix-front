"use client";
import { Button, Card } from "@/shared/ui";
import { HomeHeader } from "./HomeHeader";
import { HomeActions } from "./HomeActions";
import { HomeFeatures } from "./HomeFeatures";
import { HomeFooter } from "./HomeFooter";
import { motion } from "motion/react";
import { Mic } from "lucide-react";

export function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="w-full max-w-2xl text-center">
                    <HomeHeader />
                    <HomeActions />
                    <HomeFeatures />
                    <HomeFooter />
                </Card>
            </motion.div>
        </div>
    );
}
