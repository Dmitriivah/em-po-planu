import type { PlannedDay } from "./planning";
import type { Recipe, Unit } from "./recipes";

export type ShoppingItem = {
  ingredientId: string;
  name: string;
  amount: number;
  unit: Unit;
};

export function buildShoppingList(days: PlannedDay[], recipes: Recipe[]): ShoppingItem[] {
  const quantities = new Map<string, ShoppingItem>();
  for (const day of days) {
    for (const meal of day.meals) {
      const recipe = recipes.find((item) => item.id === meal.recipeId);
      if (!recipe) throw new Error(`Рецепт ${meal.recipeId} отсутствует в каталоге.`);
      for (const ingredient of recipe.ingredients) {
        const key = `${ingredient.id}:${ingredient.unit}`;
        const existing = quantities.get(key);
        if (existing) existing.amount += ingredient.amount / recipe.servings;
        else quantities.set(key, {
          ingredientId: ingredient.id,
          name: ingredient.name,
          amount: ingredient.amount / recipe.servings,
          unit: ingredient.unit,
        });
      }
    }
  }
  return [...quantities.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}
