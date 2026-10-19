import { useEffect, useRef } from "react";
import { calculateRecipeNutrition } from "../domain/recipes";
import type { Recipe } from "../domain/recipes";
import { getMealLabel } from "../domain/planning";
import { MacroLine } from "./Display";

type RecipeDialogProps = {
  recipe: Recipe;
  onClose: () => void;
};

export function RecipeDialog({ recipe, onClose }: RecipeDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    dialog?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;

      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose]);

  function handleBackdropClick(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <section
        className="recipe-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
        aria-describedby="recipe-modal-description"
        tabIndex={-1}
        ref={dialogRef}
      >
        <button className="modal-close" aria-label="Закрыть рецепт" onClick={onClose}>×</button>
        <div className="eyebrow">{getMealLabel(recipe.mealType)} · {recipe.category}</div>
        <h2 id="recipe-modal-title">{recipe.name}</h2>
        <p id="recipe-modal-description">{recipe.description}</p>
        <MacroLine nutrition={calculateRecipeNutrition(recipe)} />
        <p className="demo-label modal-demo">{recipe.sourceNote}</p>
        <h3>Ингредиенты · на {recipe.servings} порцию</h3>
        <ul className="modal-ingredients">
          {recipe.ingredients.map((item) => (
            <li key={item.id}><span>{item.name}</span><strong>{item.amount} {item.unit}</strong><small>{item.dataNote}</small></li>
          ))}
        </ul>
        <h3>Приготовление</h3>
        <ol className="steps-list">{recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <p className="subtle-note">Данные пищевой ценности приблизительные. Аллергены и возможное перекрёстное загрязнение могут быть указаны не полностью.</p>
      </section>
    </div>
  );
}
