"use client";
import { Button } from "@/shared/ui";
import { useRouter } from "next/navigation";
import { Plus, Users } from "lucide-react";

export function HomeActions() {
  const router = useRouter();

  const handleCreateRoom = () => {
    router.push("/create");
  };

  const handleJoinRoom = () => {
    router.push("/join");
  };

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      <Button
        variant="primary"
        size="lg"
        onClick={handleCreateRoom}
        className="w-full py-4 text-lg flex items-center justify-center"
      >
        <Plus className="w-6 h-6 mr-3" />
        Создать комнату
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={handleJoinRoom}
        className="w-full py-4 text-lg flex items-center justify-center"
      >
        <Users className="w-6 h-6 mr-3" />
        Присоединиться к комнате
      </Button>
    </div>
  );
}
