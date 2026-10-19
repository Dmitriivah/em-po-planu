import { useState } from "react";
import { calculateDayNutrition, getMealLabel, type PlannedDay } from "../domain/planning";
import type { NutritionProfile } from "../domain/nutrition";
import type { Recipe } from "../domain/recipes";
import type { PwaState } from "../pwa/register";
import { recipes } from "../domain/recipes";
import { formatNumber, NavigationIcon } from "./Display";

type TodayDashboardProps = {
  profile?: NutritionProfile;
  days: PlannedDay[];
  pwaState: PwaState;
  onRecipe: (recipe: Recipe) => void;
  onNavigate: (destination: "menu" | "profile") => void;
  onInstall: () => Promise<void>;
};

export function TodayDashboard({ profile, days, pwaState, onRecipe, onNavigate, onInstall }: TodayDashboardProps) {
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const today = days[0];
  const nutrition = today ? calculateDayNutrition(today, recipes) : undefined;

  async function handleInstall() {
    setInstallBusy(true);
    try {
      await onInstall();
    } finally {
      setInstallBusy(false);
    }
  }

  return (
    <section className="mobile-dashboard" id="today" aria-labelledby="today-title">
      <div className="mobile-greeting"><div className="eyebrow">ВАШ РИТМ ПИТАНИЯ</div><h1 id="today-title">{profile ? `Здравствуйте, ${profile.name}` : "Спланируем ваш день?"}</h1><p>{days.length ? "Ваш план и полезные детали — под рукой." : "Соберите меню и сохраните его в удобном месте."}</p></div>
      {today && nutrition ? (
        <div className="mobile-today-card">
          <div className="mobile-today-heading"><div><span className="day-label">ВАШ ПЛАН</span><h2 id="today-summary-title">Сегодня · {today.dateLabel.toLowerCase()}</h2></div><span className="mobile-today-kcal">{formatNumber(nutrition.kcal)}<small>ккал</small></span></div>
          <div className="mobile-macro-grid"><span><strong>Б</strong> {nutrition.protein} г</span><span><strong>Ж</strong> {nutrition.fat} г</span><span><strong>У</strong> {nutrition.carbs} г</span></div>
          <div className="mobile-today-meals">{today.meals.map((meal) => {
            const recipe = recipes.find((item) => item.id === meal.recipeId);
            if (!recipe) return null;
            return <button className="mobile-today-meal" key={meal.id} aria-label={`${getMealLabel(meal.type)}: открыть рецепт ${recipe.name}`} onClick={() => onRecipe(recipe)}>
              <span className="mobile-meal-icon" aria-hidden="true">{meal.type === "breakfast" ? "☼" : meal.type === "lunch" ? "◒" : meal.type === "dinner" ? "◐" : "✳"}</span>
              <span><small>{getMealLabel(meal.type)}</small><strong>{recipe.name}</strong></span>
              <span className="mobile-meal-arrow" aria-hidden="true">↗</span>
            </button>;
          })}</div>
          <button className="mobile-open-plan" onClick={() => onNavigate("menu")}>Открыть план <span aria-hidden="true">→</span></button>
        </div>
      ) : (
        <div className="mobile-empty-card"><span className="mobile-empty-mark" aria-hidden="true">✳</span><h2>Ваш план начнётся здесь</h2><p>Заполните профиль, чтобы собрать подходящее меню.</p><button className="primary-button" onClick={() => onNavigate("profile")}>Настроить профиль <span aria-hidden="true">→</span></button></div>
      )}
      {(pwaState.installPrompt || pwaState.installHelp === "ios") && <div className="install-card">
        <span className="install-mark"><NavigationIcon name="home" /></span>
        <div><strong>{pwaState.installHelp === "ios" ? "Добавьте приложение на экран «Домой»" : "Пусть меню будет под рукой"}</strong><p>{pwaState.installHelp === "ios" ? "Установка на iPhone выполняется через меню Safari." : "Установите приложение для быстрого доступа с главного экрана."}</p></div>
        {pwaState.installPrompt
          ? <button className="install-action" disabled={installBusy} onClick={handleInstall}>{installBusy ? "Открываем…" : "Установить"}</button>
          : <button className="install-action" aria-expanded={installHelpOpen} onClick={() => setInstallHelpOpen((open) => !open)}>{installHelpOpen ? "Скрыть" : "Как добавить"}</button>}
        {installHelpOpen && <p className="ios-install-help">Откройте эту страницу в Safari, нажмите «Поделиться», выберите «На экран Домой» и подтвердите добавление. В Chrome для iOS доступность этого пункта отличается.</p>}
      </div>}
      {pwaState.installHelp === "unsupported" && !window.isSecureContext && <p className="secure-context-note">Установка и офлайн-оболочка доступны через HTTPS или на локальном устройстве разработки.</p>}
    </section>
  );
}
