import type { Nutrition } from "./nutrition";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type Unit = "g" | "ml";

export type Ingredient = {
  id: string;
  name: string;
  amount: number;
  unit: Unit;
  nutritionBasis: Unit;
  nutritionPer100: Nutrition;
  allergens: string[];
  dataNote: string;
};

export type Recipe = {
  id: string;
  name: string;
  description: string;
  category: string;
  mealType: MealType;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  steps: string[];
  ingredients: Ingredient[];
  demo: true;
  sourceNote: string;
};

const manual = "Демонстрационная запись: справочные значения внесены вручную и не проверены по упаковке.";

function ingredient(
  id: string,
  name: string,
  amount: number,
  unit: Unit,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  allergens: string[] = [],
): Ingredient {
  return { id, name, amount, unit, nutritionBasis: unit, nutritionPer100: { kcal, protein, fat, carbs }, allergens, dataNote: manual };
}

export const recipes: Recipe[] = [
  {
    id: "oatmeal-apple",
    name: "Овсянка с яблоком",
    description: "Тёплая каша с яблоком и корицей.",
    category: "Каша",
    mealType: "breakfast",
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 10,
    steps: ["Залейте овсяные хлопья молоком и водой.", "Варите на слабом огне, помешивая.", "Добавьте нарезанное яблоко и корицу."],
    ingredients: [
      ingredient("oats", "Овсяные хлопья, сухие", 50, "g", 366, 12.3, 6.1, 66.3),
      ingredient("milk", "Молоко 2,5%", 150, "ml", 52, 2.8, 2.5, 4.7, ["молоко"]),
      ingredient("apple", "Яблоко", 100, "g", 52, 0.3, 0.2, 14),
    ],
    demo: true,
    sourceNote: "Данные рецепта и пищевой ценности — демонстрационные, вручную внесённые, не проверены.",
  },
  {
    id: "egg-toast",
    name: "Яйцо с помидором",
    description: "Простой горячий завтрак из яиц и овощей.",
    category: "Горячее",
    mealType: "breakfast",
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 8,
    steps: ["Нарежьте помидор.", "Обжарьте на сковороде с маслом.", "Добавьте яйца и готовьте до желаемой степени."],
    ingredients: [
      ingredient("egg", "Яйцо", 100, "g", 143, 12.6, 9.5, 0.7, ["яйцо"]),
      ingredient("tomato", "Помидор", 120, "g", 18, 0.9, 0.2, 3.9),
      ingredient("olive-oil", "Оливковое масло", 5, "g", 884, 0, 100, 0),
    ],
    demo: true,
    sourceNote: "Данные рецепта и пищевой ценности — демонстрационные, вручную внесённые, не проверены.",
  },
  {
    id: "buckwheat-chicken",
    name: "Гречка с курицей",
    description: "Гречневая крупа с куриной грудкой и овощами.",
    category: "Основное",
    mealType: "lunch",
    servings: 1,
    prepMinutes: 10,
    cookMinutes: 25,
    steps: ["Отварите гречку согласно инструкции на упаковке.", "Курицу нарежьте и приготовьте до полной готовности.", "Добавьте нарезанную морковь и подавайте с гречкой."],
    ingredients: [
      ingredient("buckwheat", "Гречка, сухая", 60, "g", 343, 13.3, 3.4, 71.5),
      ingredient("chicken", "Куриная грудка, сырая", 130, "g", 120, 22.5, 2.6, 0),
      ingredient("carrot", "Морковь", 60, "g", 41, 0.9, 0.2, 9.6),
      ingredient("olive-oil", "Оливковое масло", 5, "g", 884, 0, 100, 0),
    ],
    demo: true,
    sourceNote: "Крупа указана в сухом виде, курица — в сыром. Значения демонстрационные и не проверены.",
  },
  {
    id: "lentil-soup",
    name: "Чечевичный суп",
    description: "Овощной суп с чечевицей и томатами.",
    category: "Суп",
    mealType: "lunch",
    servings: 1,
    prepMinutes: 10,
    cookMinutes: 30,
    steps: ["Промойте чечевицу.", "Нарежьте овощи и добавьте в кастрюлю с водой.", "Варите до мягкости чечевицы."],
    ingredients: [
      ingredient("lentils", "Чечевица, сухая", 55, "g", 352, 24.6, 1.1, 63.4),
      ingredient("tomato", "Помидор", 100, "g", 18, 0.9, 0.2, 3.9),
      ingredient("carrot", "Морковь", 50, "g", 41, 0.9, 0.2, 9.6),
      ingredient("onion", "Лук репчатый", 30, "g", 40, 1.1, 0.1, 9.3),
    ],
    demo: true,
    sourceNote: "Чечевица указана в сухом виде. Значения демонстрационные, вручную внесённые, не проверены.",
  },
  {
    id: "fish-potato",
    name: "Рыба с картофелем",
    description: "Запечённая рыба с картофелем и зеленью.",
    category: "Основное",
    mealType: "dinner",
    servings: 1,
    prepMinutes: 10,
    cookMinutes: 25,
    steps: ["Нарежьте картофель и запекайте до мягкости.", "Приправьте рыбу и запекайте до готовности.", "Подавайте с лимоном или зеленью по вкусу."],
    ingredients: [
      ingredient("white-fish", "Белая рыба, сырая", 140, "g", 96, 20.1, 1.7, 0),
      ingredient("potato", "Картофель", 180, "g", 77, 2, 0.1, 17.5),
      ingredient("olive-oil", "Оливковое масло", 5, "g", 884, 0, 100, 0),
    ],
    demo: true,
    sourceNote: "Вид рыбы не уточнён, поэтому расчёт приблизительный и демонстрационный.",
  },
  {
    id: "chicken-vegetables",
    name: "Курица с овощами",
    description: "Куриная грудка с овощами, приготовленная на сковороде.",
    category: "Основное",
    mealType: "dinner",
    servings: 1,
    prepMinutes: 10,
    cookMinutes: 20,
    steps: ["Нарежьте курицу и овощи.", "Приготовьте курицу до полной готовности.", "Добавьте овощи и тушите до мягкости."],
    ingredients: [
      ingredient("chicken", "Куриная грудка, сырая", 150, "g", 120, 22.5, 2.6, 0),
      ingredient("carrot", "Морковь", 60, "g", 41, 0.9, 0.2, 9.6),
      ingredient("tomato", "Помидор", 100, "g", 18, 0.9, 0.2, 3.9),
      ingredient("olive-oil", "Оливковое масло", 5, "g", 884, 0, 100, 0),
    ],
    demo: true,
    sourceNote: "Данные рецепта и пищевой ценности — демонстрационные, вручную внесённые, не проверены.",
  },
  {
    id: "apple-kefir",
    name: "Кефир с яблоком",
    description: "Лёгкий перекус из кефира и свежего яблока.",
    category: "Перекус",
    mealType: "snack",
    servings: 1,
    prepMinutes: 3,
    cookMinutes: 0,
    steps: ["Налейте кефир.", "Подавайте с нарезанным яблоком."],
    ingredients: [
      ingredient("kefir", "Кефир 2,5%", 200, "ml", 53, 3, 2.5, 4),
      ingredient("apple", "Яблоко", 100, "g", 52, 0.3, 0.2, 14),
    ],
    demo: true,
    sourceNote: "Данные рецепта и пищевой ценности — демонстрационные, вручную внесённые, не проверены.",
  },
  {
    id: "cottage-cheese",
    name: "Творог с яблоком",
    description: "Творог с кусочками яблока без добавленного сахара.",
    category: "Перекус",
    mealType: "snack",
    servings: 1,
    prepMinutes: 5,
    cookMinutes: 0,
    steps: ["Нарежьте яблоко.", "Смешайте с творогом и подавайте."],
    ingredients: [
      ingredient("cottage-cheese", "Творог 5%", 150, "g", 121, 17, 5, 3),
      ingredient("apple", "Яблоко", 80, "g", 52, 0.3, 0.2, 14),
    ],
    demo: true,
    sourceNote: "Жирность и пищевая ценность творога демонстрационные, не сверены с конкретной упаковкой.",
  },
];

export function calculateRecipeNutrition(recipe: Recipe): Nutrition {
  const total = recipe.ingredients.reduce(
    (sum, item) => {
      if (item.unit !== item.nutritionBasis) {
        throw new Error(`Для ингредиента «${item.name}» нельзя пересчитать ${item.unit} по данным на ${item.nutritionBasis}.`);
      }
      const factor = item.amount / 100;
      return {
        kcal: sum.kcal + item.nutritionPer100.kcal * factor,
        protein: sum.protein + item.nutritionPer100.protein * factor,
        fat: sum.fat + item.nutritionPer100.fat * factor,
        carbs: sum.carbs + item.nutritionPer100.carbs * factor,
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  );
  return {
    kcal: total.kcal / recipe.servings,
    protein: total.protein / recipe.servings,
    fat: total.fat / recipe.servings,
    carbs: total.carbs / recipe.servings,
  };
}

export function recipeMatchesRestrictions(recipe: Recipe, restrictions: string[]): boolean {
  const normalized = restrictions.map((value) => value.trim().toLocaleLowerCase("ru")).filter(Boolean);
  return !recipe.ingredients.some((item) =>
    [item.id, item.name, ...item.allergens].some((value) =>
      normalized.some((restriction) => value.toLocaleLowerCase("ru").includes(restriction)),
    ),
  );
}
