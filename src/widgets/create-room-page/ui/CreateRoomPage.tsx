"use client";
import { Card } from "@/shared/ui";
import { CreateRoomHeader } from "./CreateRoomHeader";
import { CreateRoomForm } from "./CreateRoomForm";
import { CreateRoomFooter } from "./CreateRoomFooter";
import { API_CONFIG } from "@/shared/config";

export function CreateRoomPage() {
  console.log(API_CONFIG.baseURL);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CreateRoomHeader />
        <CreateRoomForm />
        <CreateRoomFooter />
      </Card>
    </div>
  );
}
