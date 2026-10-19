import { calculateDayNutrition, calculateKcalDeviation, getMealLabel, type PlannedDay } from "../domain/planning";
import { calculateRecipeNutrition, recipes, type Recipe } from "../domain/recipes";
import type { ShoppingItem } from "../domain/shopping";
import type { AppState } from "../domain/storage";
import { formatNumber } from "./Display";

type PlanSectionProps = {
  state: AppState;
  shopping: ShoppingItem[];
  targetKcal: number | undefined;
  activeTab: "plan" | "shopping";
  onTabChange: (tab: "plan" | "shopping") => void;
  onRecipeSelect: (recipe: Recipe) => void;
  onMealReplace: (dayIndex: number, meal: PlannedDay["meals"][number]) => void;
  onShoppingToggle: (id: string) => void;
  onReturnToPlan: () => void;
};

function DayCards({ state, targetKcal, onRecipeSelect, onMealReplace }: Pick<PlanSectionProps, "state" | "targetKcal" | "onRecipeSelect" | "onMealReplace">) {
  return <div className="days-grid">{state.days.map((day, dayIndex) => {
    const nutrition = calculateDayNutrition(day, recipes);
    const difference = targetKcal === undefined ? null : calculateKcalDeviation(nutrition.kcal, targetKcal);
    const deviationText = difference === null
      ? "Отклонение от цели недоступно без сохранённого профиля."
      : Math.round(Math.abs(difference)) === 0
        ? "Расчётный итог близок к ориентиру (разница меньше 1 ккал)."
        : `Примерно на ${formatNumber(Math.round(Math.abs(difference)))} ккал ${difference < 0 ? "ниже" : "выше"} расчётного ориентира.`;
    return <article className="day-card" key={day.dateLabel}>
      <div className="day-header"><div><span className="day-label">ВАШ ПЛАН</span><h3>{day.dateLabel}</h3></div><span className="day-total">{formatNumber(nutrition.kcal)} <small>ккал</small></span></div>
      <p className="target-deviation">{deviationText}</p>
      <p className="target-source-note">Оценка по демонстрационным рецептам; данные не проверены.</p>
      <div className="day-macros"><span>Б {nutrition.protein} г</span><span>Ж {nutrition.fat} г</span><span>У {nutrition.carbs} г</span></div>
      <div className="meal-list">{day.meals.map((meal) => {
        const recipe = recipes.find((item) => item.id === meal.recipeId);
        if (!recipe) return null;
        const recipeNutrition = calculateRecipeNutrition(recipe);
        return <div className="meal-row" key={meal.id}>
          <span className="meal-marker" aria-hidden="true">{meal.type === "breakfast" ? "☼" : meal.type === "lunch" ? "◒" : meal.type === "dinner" ? "◐" : "✳"}</span>
          <div className="meal-info"><small>{getMealLabel(meal.type)}</small><button className="recipe-link" onClick={() => onRecipeSelect(recipe)}>{recipe.name}</button><span>{formatNumber(recipeNutrition.kcal)} ккал · {recipe.prepMinutes + recipe.cookMinutes} мин</span></div>
          <button className="icon-button" aria-label={`Заменить блюдо: ${recipe.name}`} title="Заменить блюдо" onClick={() => onMealReplace(dayIndex, meal)}>↻</button>
        </div>;
      })}</div>
      {targetKcal !== undefined && nutrition.kcal < targetKcal * 0.75 && <div className="warning-note compact-warning">Доступный каталог заметно не покрывает расчётную цель. Не считайте этот план полноценным рационом.</div>}
    </article>;
  })}</div>;
}

function ShoppingPanel({ state, shopping, onShoppingToggle, onReturnToPlan }: Pick<PlanSectionProps, "state" | "shopping" | "onShoppingToggle" | "onReturnToPlan">) {
  const checkedIds = new Set(state.checkedShoppingItems);
  const remainingCount = shopping.reduce((count, item) => count + (checkedIds.has(`${item.ingredientId}:${item.unit}`) ? 0 : 1), 0);
  return <div className="shopping-layout" id="purchases">
    <div className="panel shopping-panel">
      <div className="shopping-title"><div><h3>Что купить</h3><p>Количество рассчитано по порциям рецептов</p></div><span className="shopping-count" aria-live="polite">{remainingCount} осталось</span></div>
      {!shopping.length ? <div className="shopping-empty"><span aria-hidden="true">✓</span><strong>Список пока пуст</strong><p>Составьте меню — ингредиенты появятся здесь.</p></div> : <ul className="shopping-list">{shopping.map((item) => {
        const key = `${item.ingredientId}:${item.unit}`;
        const checked = checkedIds.has(key);
        return <li key={key} className={checked ? "checked" : ""}>
          <label><input type="checkbox" checked={checked} onChange={() => onShoppingToggle(key)} /><span className="checkmark" aria-hidden="true" /><span className="shopping-name">{item.name}</span><span className="shopping-amount">{new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(item.amount)} {item.unit}</span></label>
        </li>;
      })}</ul>}
      <div className="price-notice"><strong>Стоимость пока не рассчитана</strong><p>В каталоге нет проверенных цен и фасовок. Сумма покупки не показывается, чтобы не создавать ложную оценку.</p></div>
    </div>
    <aside className="panel shopping-side"><span className="side-icon" aria-hidden="true">↗</span><h3>Список обновляется вместе с меню</h3><p>Замените блюдо — ингредиенты пересчитаются. Цены появятся после создания проверенного каталога товаров и упаковок.</p><button className="text-button" onClick={onReturnToPlan}>Вернуться к меню <span aria-hidden="true">→</span></button></aside>
  </div>;
}

export function PlanSection({ state, shopping, targetKcal, activeTab, onTabChange, onRecipeSelect, onMealReplace, onShoppingToggle, onReturnToPlan }: PlanSectionProps) {
  return <section className="results-section" id="results">
    <div className="section-heading results-heading">
      <div><div className="eyebrow">ВАШ ПЛАН</div><h2>{state.days.length ? "На столе — ваш план" : "Пусть меню работает на вас"}</h2></div>
      {state.days.length > 0 && <div className="tabs" role="tablist" aria-label="Содержимое плана">
        <button role="tab" aria-selected={activeTab === "plan"} className={activeTab === "plan" ? "active" : ""} onClick={() => onTabChange("plan")}>Меню</button>
        <button role="tab" aria-selected={activeTab === "shopping"} className={activeTab === "shopping" ? "active" : ""} onClick={() => onTabChange("shopping")}>Покупки <span>{shopping.length}</span></button>
      </div>}
    </div>
    {activeTab === "plan" && !state.days.length
      ? <div className="empty-plan"><div className="empty-illustration" aria-hidden="true">✳</div><h3>Ваш план появится здесь</h3><p>Сохраните профиль и выберите длительность меню. Рецепты, расчёты и список покупок будут связаны между собой.</p></div>
      : activeTab === "plan"
        ? <DayCards state={state} targetKcal={targetKcal} onRecipeSelect={onRecipeSelect} onMealReplace={onMealReplace} />
        : <ShoppingPanel state={state} shopping={shopping} onShoppingToggle={onShoppingToggle} onReturnToPlan={onReturnToPlan} />}
  </section>;
}
