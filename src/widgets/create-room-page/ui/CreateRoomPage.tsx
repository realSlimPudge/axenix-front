"use client";
import { Card } from "@/shared/ui";
import { CreateRoomHeader } from "./CreateRoomHeader";
import { CreateRoomForm } from "./CreateRoomForm";
import { CreateRoomFooter } from "./CreateRoomFooter";
import { API_CONFIG } from "@/shared/config";
import { motion } from "motion/react";

export function CreateRoomPage() {
    console.log(API_CONFIG.baseURL);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="w-full max-w-md">
                    <CreateRoomHeader />
                    <CreateRoomForm />
                    <CreateRoomFooter />
                </Card>
            </motion.div>
        </div>
    );
}
