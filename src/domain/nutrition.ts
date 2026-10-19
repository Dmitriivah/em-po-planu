export type Nutrition = {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
};

export type Activity = "minimal" | "low" | "moderate" | "high" | "very-high";
export type FormulaSex = "male" | "female";
export type Goal = "maintain" | "lose" | "gain";

export type NutritionProfile = {
  name: string;
  age: number;
  sex: FormulaSex;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
  allergies: string[];
  excludedIngredients: string[];
  customKcal?: number;
};

const ACTIVITY_FACTORS: Record<Activity, number> = {
  minimal: 1.2,
  low: 1.375,
  moderate: 1.55,
  high: 1.725,
  "very-high": 1.9,
};

export function validateProfile(profile: NutritionProfile): string[] {
  const errors: string[] = [];
  if (!profile.name.trim()) errors.push("Укажите имя или удобное обозначение.");
  if (!Number.isInteger(profile.age) || profile.age < 18 || profile.age > 100) {
    errors.push("Для этого расчёта нужен возраст от 18 до 100 лет.");
  }
  if (!Number.isFinite(profile.heightCm) || profile.heightCm < 120 || profile.heightCm > 230) {
    errors.push("Рост должен быть от 120 до 230 см.");
  }
  if (!Number.isFinite(profile.weightKg) || profile.weightKg < 30 || profile.weightKg > 300) {
    errors.push("Вес должен быть от 30 до 300 кг.");
  }
  if (profile.customKcal !== undefined && (!Number.isFinite(profile.customKcal) || profile.customKcal < 1200 || profile.customKcal > 6000)) {
    errors.push("Пользовательская цель должна быть от 1 200 до 6 000 ккал.");
  }
  return errors;
}

export function calculateBmr(profile: Pick<NutritionProfile, "age" | "sex" | "heightCm" | "weightKg">): number {
  const sexOffset = profile.sex === "male" ? 5 : -161;
  return 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + sexOffset;
}

export function calculateTdee(profile: NutritionProfile): number {
  return calculateBmr(profile) * ACTIVITY_FACTORS[profile.activity];
}

export function calculateTargetKcal(profile: NutritionProfile): number {
  if (profile.customKcal !== undefined) return profile.customKcal;
  const tdee = calculateTdee(profile);
  const multiplier = profile.goal === "lose" ? 0.9 : profile.goal === "gain" ? 1.1 : 1;
  return Math.round((tdee * multiplier) / 10) * 10;
}

export function macroEnergy(macro: Pick<Nutrition, "protein" | "fat" | "carbs">): number {
  return macro.protein * 4 + macro.fat * 9 + macro.carbs * 4;
}

export function roundNutrition(value: Nutrition): Nutrition {
  return {
    kcal: Math.round(value.kcal),
    protein: Math.round(value.protein * 10) / 10,
    fat: Math.round(value.fat * 10) / 10,
    carbs: Math.round(value.carbs * 10) / 10,
  };
}
