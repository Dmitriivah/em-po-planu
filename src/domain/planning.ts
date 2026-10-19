import { calculateRecipeNutrition, recipeMatchesRestrictions, type MealType, type Recipe } from "./recipes";
import type { Nutrition, NutritionProfile } from "./nutrition";
import { roundNutrition } from "./nutrition";

export type PlannedMeal = { id: string; recipeId: string; type: MealType };
export type PlannedDay = { dateLabel: string; meals: PlannedMeal[] };

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const mealLabels: Record<MealType, string> = {
  breakfast: "Завтрак",
  lunch: "Обед",
  dinner: "Ужин",
  snack: "Перекус",
};

export function getMealLabel(type: MealType): string {
  return mealLabels[type];
}

export function calculateKcalDeviation(actualKcal: number, targetKcal: number): number | null {
  if (!Number.isFinite(actualKcal) || !Number.isFinite(targetKcal) || targetKcal <= 0) return null;
  return actualKcal - targetKcal;
}

export function buildMealPlan(recipes: Recipe[], profile: NutritionProfile, days: number, mealsPerDay: number): PlannedDay[] {
  if (![1, 3, 7, 14].includes(days)) throw new Error("Продолжительность плана должна быть 1, 3, 7 или 14 дней.");
  if (!Number.isInteger(mealsPerDay) || mealsPerDay < 2 || mealsPerDay > 6) {
    throw new Error("Количество приёмов пищи должно быть от 2 до 6.");
  }
  const allowed = recipes.filter((recipe) => recipeMatchesRestrictions(recipe, [...profile.allergies, ...profile.excludedIngredients]));
  if (allowed.length === 0) throw new Error("Нет рецептов, подходящих под все ограничения. Ослабляйте только необязательные исключения; аллергены не снимайте.");

  const selectedTypes = mealsPerDay === 2
    ? ["lunch", "dinner"] as MealType[]
    : mealOrder.slice(0, Math.min(mealsPerDay, mealOrder.length));
  while (selectedTypes.length < mealsPerDay) selectedTypes.push(mealOrder[selectedTypes.length % mealOrder.length]);
  const missingTypes = [...new Set(selectedTypes.filter((type) => !allowed.some((recipe) => recipe.mealType === type)))];
  if (missingTypes.length > 0) {
    throw new Error(`Не удалось подобрать: ${missingTypes.map(getMealLabel).join(", ")}. Измените необязательные исключения; аллергены не снимайте.`);
  }
  const nextOccurrence: Record<string, number> = {};

  return Array.from({ length: days }, (_, dayIndex) => ({
    dateLabel: `День ${dayIndex + 1}`,
    meals: selectedTypes.flatMap((type, mealIndex) => {
      const candidates = allowed.filter((recipe) => recipe.mealType === type);
      if (candidates.length === 0) return [];
      const offset = nextOccurrence[type] ?? dayIndex;
      nextOccurrence[type] = offset + 1;
      const recipe = candidates[offset % candidates.length];
      return [{ id: `${dayIndex}-${mealIndex}`, recipeId: recipe.id, type }];
    }),
  }));
}

export function replacePlannedMeal(
  days: PlannedDay[],
  dayIndex: number,
  mealId: string,
  recipes: Recipe[],
  profile: NutritionProfile,
): PlannedDay[] {
  const updated = structuredClone(days);
  const meal = updated[dayIndex]?.meals.find((candidate) => candidate.id === mealId);
  if (!meal) throw new Error("Блюдо не найдено в текущем плане.");
  const alternatives = recipes.filter(
    (recipe) =>
      recipe.mealType === meal.type &&
      recipe.id !== meal.recipeId &&
      recipeMatchesRestrictions(recipe, [...profile.allergies, ...profile.excludedIngredients]),
  );
  if (alternatives.length === 0) throw new Error("Для этого приёма пищи нет другого подходящего рецепта.");
  const currentIndex = recipes.findIndex((recipe) => recipe.id === meal.recipeId);
  const replacement = alternatives.find((recipe) => recipes.findIndex((item) => item.id === recipe.id) > currentIndex) ?? alternatives[0];
  meal.recipeId = replacement.id;
  return updated;
}

export function calculateDayNutrition(day: PlannedDay, recipes: Recipe[]): Nutrition {
  const result = day.meals.reduce(
    (sum, meal) => {
      const recipe = recipes.find((item) => item.id === meal.recipeId);
      if (!recipe) throw new Error(`Рецепт ${meal.recipeId} отсутствует в каталоге.`);
      const nutrition = calculateRecipeNutrition(recipe);
      return {
        kcal: sum.kcal + nutrition.kcal,
        protein: sum.protein + nutrition.protein,
        fat: sum.fat + nutrition.fat,
        carbs: sum.carbs + nutrition.carbs,
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  return roundNutrition(result);
}
