"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui";
import { Card } from "@/shared/ui";

export default function NotFoundPage() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push("/");
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center relative overflow-hidden">
        {/* Декоративные элементы */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-xl"></div>

        <div className="relative z-10">
          {/* Анимированное число 404 */}
          <div className="mb-8">
            <div className="text-8xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              404
            </div>
            <div className="w-24 h-1 bg-gradient-to-r from-primary-600 to-purple-600 mx-auto mt-4 rounded-full"></div>
          </div>

          {/* Заголовок и описание */}
          <h1 className="text-2xl font-bold text-white mb-4">
            Страница не найдена
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            К сожалению, мы не можем найти страницу, которую вы ищете. Возможно,
            она была перемещена или удалена.
          </p>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex-1 sm:flex-none"
            >
              ← Назад
            </Button>
            <Button
              variant="primary"
              onClick={handleGoHome}
              className="flex-1 sm:flex-none"
            >
              На главную
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
