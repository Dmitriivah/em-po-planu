import { describe, expect, it } from "vitest";
import { calculateBmr, calculateTargetKcal, calculateTdee, macroEnergy, validateProfile, type NutritionProfile } from "./nutrition";
import { buildMealPlan, calculateDayNutrition, calculateKcalDeviation, replacePlannedMeal } from "./planning";
import { calculateRecipeNutrition, recipes, recipeMatchesRestrictions } from "./recipes";
import { calculatePackageCost } from "./pricing";
import { buildShoppingList } from "./shopping";

const profile: NutritionProfile = {
  name: "Тест",
  age: 30,
  sex: "female",
  heightCm: 165,
  weightKg: 65,
  activity: "moderate",
  goal: "maintain",
  allergies: [],
  excludedIngredients: [],
};

describe("nutrition calculations", () => {
  it("calculates both Mifflin-St Jeor formula variants", () => {
    expect(calculateBmr(profile)).toBeCloseTo(1370.25);
    expect(calculateBmr({ ...profile, sex: "male" })).toBeCloseTo(1536.25);
  });

  it.each([
    ["minimal", 1.2],
    ["low", 1.375],
    ["moderate", 1.55],
    ["high", 1.725],
    ["very-high", 1.9],
  ] as const)("applies the %s activity multiplier", (activity, factor) => {
    expect(calculateTdee({ ...profile, activity })).toBeCloseTo(1370.25 * factor);
  });

  it("uses conservative weight-goal adjustments and preserves a manual target", () => {
    expect(calculateTargetKcal({ ...profile, goal: "lose" })).toBe(1910);
    expect(calculateTargetKcal({ ...profile, goal: "gain" })).toBe(2340);
    expect(calculateTargetKcal({ ...profile, customKcal: 1875 })).toBe(1875);
  });

  it("calculates macro energy and rejects unsafe or malformed profiles", () => {
    expect(macroEnergy({ protein: 25, fat: 10, carbs: 40 })).toBe(350);
    expect(validateProfile(profile)).toEqual([]);
    expect(validateProfile({ ...profile, age: 17, weightKg: -2 })).toHaveLength(2);
    expect(validateProfile({ ...profile, customKcal: 1100 })).toContain("Пользовательская цель должна быть от 1 200 до 6 000 ккал.");
  });

  it("sums ingredient nutrition and reports one-serving recipe nutrition", () => {
    const recipe = recipes.find((item) => item.id === "oatmeal-apple");
    expect(recipe).toBeDefined();
    const result = calculateRecipeNutrition(recipe!);
    expect(result.kcal).toBeCloseTo(366 * 0.5 + 52 * 1.5 + 52);
    expect(result.protein).toBeCloseTo(12.3 * 0.5 + 2.8 * 1.5 + 0.3);
  });

  it("filters allergens and excluded ingredients without weakening restrictions", () => {
    const eggBreakfast = recipes.find((item) => item.id === "egg-toast")!;
    expect(recipeMatchesRestrictions(eggBreakfast, ["яйцо"])).toBe(false);
    expect(recipeMatchesRestrictions(eggBreakfast, ["лосось"])).toBe(true);
    const plan = buildMealPlan(recipes, { ...profile, allergies: ["молоко"] }, 1, 3);
    expect(plan.flatMap((day) => day.meals).some((meal) => meal.recipeId === "oatmeal-apple")).toBe(false);
  });

  it("does not silently return fewer meal slots when restrictions remove a category", () => {
    expect(() => buildMealPlan(recipes, { ...profile, excludedIngredients: ["egg", "овсяные хлопья"] }, 1, 3))
      .toThrow("Не удалось подобрать: Завтрак");
  });

  it("keeps allergen restrictions when every recipe in a selected category is excluded", () => {
    expect(() => buildMealPlan(recipes, { ...profile, allergies: ["молоко", "яйцо"] }, 1, 3))
      .toThrow("аллергены не снимайте");
  });

  it("reports signed calorie deviations and does not invent a difference without a valid target", () => {
    expect(calculateKcalDeviation(1800, 1800)).toBe(0);
    expect(calculateKcalDeviation(1799.5, 1800)).toBe(-0.5);
    expect(calculateKcalDeviation(1801, 1800)).toBe(1);
    expect(calculateKcalDeviation(1800, 0)).toBeNull();
    expect(calculateKcalDeviation(Number.NaN, 1800)).toBeNull();
  });

  it("does not calculate recipe nutrition using incompatible mass and volume units", () => {
    const recipe = recipes.find((item) => item.id === "oatmeal-apple")!;
    const incompatible = {
      ...recipe,
      ingredients: recipe.ingredients.map((item) =>
        item.id === "milk" ? { ...item, nutritionBasis: "g" as const } : item,
      ),
    };
    expect(() => calculateRecipeNutrition(incompatible)).toThrow("нельзя пересчитать ml по данным на g");
  });
});

describe("meal planning and shopping", () => {
  it("creates a deterministic multi-day plan and calculates daily totals", () => {
    const first = buildMealPlan(recipes, profile, 3, 3);
    expect(buildMealPlan(recipes, profile, 3, 3)).toEqual(first);
    expect(first).toHaveLength(3);
    expect(first[0].meals).toHaveLength(3);
    expect(calculateDayNutrition(first[0], recipes).kcal).toBeGreaterThan(0);
    expect(buildMealPlan(recipes, profile, 14, 6)[0].meals).toHaveLength(6);
  });

  it("rejects unsupported plan settings instead of silently clamping them", () => {
    expect(() => buildMealPlan(recipes, profile, 2, 3)).toThrow("1, 3, 7 или 14");
    expect(() => buildMealPlan(recipes, profile, 3, 1)).toThrow("от 2 до 6");
  });

  it("replaces only one meal and rejects missing alternatives", () => {
    const plan = buildMealPlan(recipes, profile, 1, 3);
    const changed = replacePlannedMeal(plan, 0, plan[0].meals[0].id, recipes, profile);
    expect(changed[0].meals[0].recipeId).not.toBe(plan[0].meals[0].recipeId);
    expect(changed[0].meals.slice(1)).toEqual(plan[0].meals.slice(1));
    expect(() => replacePlannedMeal(plan, 0, plan[0].meals[0].id, recipes.filter((recipe) => recipe.id === plan[0].meals[0].recipeId), profile)).toThrow("нет другого подходящего");
  });

  it("merges shared ingredients and produces an empty list for an empty plan", () => {
    const plan = buildMealPlan(recipes, profile, 1, 3);
    expect(buildShoppingList(plan, recipes).find((item) => item.ingredientId === "carrot")?.amount).toBe(60);
    expect(buildShoppingList([], recipes)).toEqual([]);
  });
});

describe("package pricing", () => {
  it("separates used-ingredient cost from whole-package checkout cost", () => {
    const estimate = calculatePackageCost(200, 0, { amount: 500, priceKopecks: 15000, unit: "g" });
    expect(estimate).toEqual({
      packagesToBuy: 1,
      amountToBuy: 500,
      usedCostKopecks: 6000,
      purchaseCostKopecks: 15000,
      coverage: "estimated",
    });
  });

  it("rounds package counts up after deducting pantry stock", () => {
    expect(calculatePackageCost(1200, 200, { amount: 500, priceKopecks: 12500, unit: "g" })).toMatchObject({
      packagesToBuy: 2,
      amountToBuy: 1000,
      usedCostKopecks: 30000,
      purchaseCostKopecks: 25000,
    });
  });

  it("validates units indirectly by requiring a positive package size and exact kopeck input", () => {
    expect(() => calculatePackageCost(10, 0, { amount: 0, priceKopecks: 100, unit: "g" })).toThrow("Размер упаковки");
    expect(() => calculatePackageCost(10, 0, { amount: 50, priceKopecks: 1.5, unit: "g" })).toThrow("целым числом копеек");
  });
});
