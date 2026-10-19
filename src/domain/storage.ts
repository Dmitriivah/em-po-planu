import type { NutritionProfile } from "./nutrition";
import type { PlannedDay } from "./planning";

export type AppState = {
  profile?: NutritionProfile;
  days: PlannedDay[];
  duration: number;
  mealsPerDay: number;
  checkedShoppingItems: string[];
};

export type LoadedState = { state: AppState; warning?: string };

const STORAGE_KEY = "em-po-planu:v1";

function emptyState(): AppState {
  return { days: [], duration: 3, mealsPerDay: 3, checkedShoppingItems: [] };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isProfile(value: unknown): value is NutritionProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.name === "string" &&
    typeof profile.age === "number" &&
    (profile.sex === "male" || profile.sex === "female") &&
    typeof profile.heightCm === "number" &&
    typeof profile.weightKg === "number" &&
    ["minimal", "low", "moderate", "high", "very-high"].includes(String(profile.activity)) &&
    ["maintain", "lose", "gain"].includes(String(profile.goal)) &&
    isStringArray(profile.allergies) &&
    isStringArray(profile.excludedIngredients) &&
    (profile.customKcal === undefined || typeof profile.customKcal === "number");
}

function isPlan(value: unknown): value is PlannedDay[] {
  return Array.isArray(value) && value.every((day) => {
    if (typeof day !== "object" || day === null) return false;
    const plannedDay = day as Record<string, unknown>;
    return typeof plannedDay.dateLabel === "string" &&
      Array.isArray(plannedDay.meals) &&
      plannedDay.meals.every((meal) => {
        if (typeof meal !== "object" || meal === null) return false;
        const plannedMeal = meal as Record<string, unknown>;
        return typeof plannedMeal.id === "string" &&
          typeof plannedMeal.recipeId === "string" &&
          ["breakfast", "lunch", "dinner", "snack"].includes(String(plannedMeal.type));
      });
  });
}

function isAppState(value: unknown): value is AppState {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Record<string, unknown>;
  return (state.profile === undefined || isProfile(state.profile)) &&
    isPlan(state.days) &&
    [1, 3, 7, 14].includes(Number(state.duration)) &&
    Number.isInteger(state.mealsPerDay) &&
    Number(state.mealsPerDay) >= 2 &&
    Number(state.mealsPerDay) <= 6 &&
    isStringArray(state.checkedShoppingItems);
}

function unreadableState(): LoadedState {
  const warning = "Не удалось прочитать сохранённый план. Исходные данные в браузере не перезаписаны; проверьте консоль или сохраните новый профиль.";
  console.error(warning);
  return { state: emptyState(), warning };
}

export function loadState(): LoadedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: emptyState() };
    const parsed: unknown = JSON.parse(raw);
    if (isAppState(parsed)) return { state: parsed };
    return unreadableState();
  } catch (error) {
    console.error("Не удалось восстановить локальные данные.", error);
    return unreadableState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Не удалось сохранить данные в этом браузере.", error);
    throw new Error("Не удалось сохранить изменения. Проверьте свободное место и настройки браузера.");
  }
}
