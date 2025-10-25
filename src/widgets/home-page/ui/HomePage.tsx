"use client";
import { Card } from "@/shared/ui";
import { HomeHeader } from "./HomeHeader";
import { HomeActions } from "./HomeActions";
import { HomeFeatures } from "./HomeFeatures";
import { HomeFooter } from "./HomeFooter";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl text-center">
        <HomeHeader />
        <HomeActions />
        <HomeFeatures />
        <HomeFooter />
      </Card>
    </div>
  );
}
