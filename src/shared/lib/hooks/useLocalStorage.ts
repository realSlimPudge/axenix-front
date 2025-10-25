"use client";
import { useSyncExternalStore } from "react";

// Функция для подписки на изменения localStorage
function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

// Хук для работы с localStorage
export function useLocalStorage<T>(key: string, initialValue: T) {
  const getSnapshot = (): T => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  // Добавляем getServerSnapshot для серверного рендеринга
  const getServerSnapshot = (): T => {
    return initialValue;
  };

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = (newValue: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        newValue instanceof Function ? newValue(value) : newValue;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Триггерим custom event для уведомления других компонентов
        window.dispatchEvent(new StorageEvent("storage", { key }));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setValue] as const;
}
