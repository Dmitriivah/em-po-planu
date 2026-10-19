import { useMemo, useState } from "react";
import { getMealLabel } from "../domain/planning";
import type { NutritionProfile } from "../domain/nutrition";
import { calculateRecipeNutrition, recipeMatchesRestrictions, recipes, type Recipe } from "../domain/recipes";
import { MacroLine } from "./Display";

type RecipeLibraryProps = {
  profile?: NutritionProfile;
  favorites: string[];
  onFavoriteToggle: (id: string) => void;
  onRecipeSelect: (recipe: Recipe) => void;
};

const recipeSymbols = ["◉", "◒", "✳", "◈"];

export function RecipeLibrary({ profile, favorites, onFavoriteToggle, onRecipeSelect }: RecipeLibraryProps) {
  const [search, setSearch] = useState("");
  const visibleRecipes = useMemo(() => recipes.filter((recipe) => {
    const query = search.trim().toLocaleLowerCase("ru");
    const matchesSearch = `${recipe.name} ${recipe.ingredients.map((item) => item.name).join(" ")}`
      .toLocaleLowerCase("ru")
      .includes(query);
    return matchesSearch && (!profile || recipeMatchesRestrictions(recipe, [...profile.allergies, ...profile.excludedIngredients]));
  }), [profile, search]);

  return (
    <section className="recipe-library" id="recipes" aria-labelledby="recipe-library-title">
      <div className="section-heading">
        <div><div className="eyebrow">КАТАЛОГ РЕЦЕПТОВ</div><h2 id="recipe-library-title">Идеи для вашего стола</h2></div>
        <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Рецепт или ингредиент" aria-label="Поиск рецептов и ингредиентов" /></label>
      </div>
      <div className="recipe-grid">{visibleRecipes.map((recipe, index) => {
        const favorited = favorites.includes(recipe.id);
        return <article className={`recipe-card recipe-tone-${index % recipeSymbols.length}`} key={recipe.id}>
          <div className="recipe-art">
            <span className="recipe-art-symbol" aria-hidden="true">{recipeSymbols[index % recipeSymbols.length]}</span>
            <span className="recipe-category">{recipe.category}</span>
            <button
              className={`favorite-button${favorited ? " favorited" : ""}`}
              aria-label={`${favorited ? "Убрать из избранного" : "Добавить в избранное"}: ${recipe.name}`}
              aria-pressed={favorited}
              onClick={() => onFavoriteToggle(recipe.id)}
            >
              <span aria-hidden="true">{favorited ? "♥" : "♡"}</span>
            </button>
          </div>
          <div className="recipe-card-body">
            <div className="recipe-meta">{getMealLabel(recipe.mealType)} <span>·</span> {recipe.prepMinutes + recipe.cookMinutes} мин</div>
            <button className="recipe-card-title" aria-label={`Открыть рецепт: ${recipe.name}`} onClick={() => onRecipeSelect(recipe)}>{recipe.name}</button>
            <MacroLine nutrition={calculateRecipeNutrition(recipe)} />
            <span className="demo-label">Демонстрационный рецепт · значения не проверены</span>
          </div>
        </article>;
      })}</div>
      {visibleRecipes.length === 0 && <div className="empty-filter">Подходящих рецептов не найдено. Измените запрос или проверьте ограничения профиля.</div>}
      {favorites.length > 0 && <p className="favorites-summary" role="status">Сохранено в избранном: {favorites.length} {favorites.length === 1 ? "рецепт" : "рецепта"}.</p>}
    </section>
  );
}
