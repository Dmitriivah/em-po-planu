import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { buildMealPlan, replacePlannedMeal, type PlannedDay } from "../domain/planning";
import { calculateTargetKcal, validateProfile, type NutritionProfile } from "../domain/nutrition";
import { recipes, type Recipe } from "../domain/recipes";
import { buildShoppingList } from "../domain/shopping";
import { loadState, saveState, type AppState } from "../domain/storage";
import { applyPwaUpdate, promptInstall, registerPwa, type PwaState } from "../pwa/register";
import { BottomNavigation, PrimaryNavigation } from "./Navigation";
import { PlanSection } from "./PlanSection";
import { ProfileWorkspace } from "./ProfileWorkspace";
import { RecipeDialog } from "./RecipeDialog";
import { RecipeLibrary } from "./RecipeLibrary";
import { TodayDashboard } from "./TodayDashboard";
import type { NavigationDestination } from "./Display";

const emptyProfile: NutritionProfile = {
  name: "",
  age: 30,
  sex: "female",
  heightCm: 165,
  weightKg: 65,
  activity: "moderate",
  goal: "maintain",
  allergies: [],
  excludedIngredients: [],
};

function parseList(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

export default function App() {
  const [loaded] = useState(() => loadState());
  const [state, setState] = useState<AppState>(loaded.state);
  const skipFirstSave = useRef(true);
  const [profileDraft, setProfileDraft] = useState<NutritionProfile>(state.profile ?? emptyProfile);
  const [allergiesText, setAllergiesText] = useState((state.profile?.allergies ?? []).join(", "));
  const [excludedText, setExcludedText] = useState((state.profile?.excludedIngredients ?? []).join(", "));
  const [daysCount, setDaysCount] = useState(state.duration);
  const [mealsCount, setMealsCount] = useState(state.mealsPerDay);
  const [message, setMessage] = useState(loaded.warning ?? "");
  const [activeTab, setActiveTab] = useState<"plan" | "shopping">("plan");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe>();
  const [pwaState, setPwaState] = useState<PwaState>({ installHelp: null, updateReady: false });
  const [installBusy, setInstallBusy] = useState(false);
  const [activeNavigation, setActiveNavigation] = useState<NavigationDestination>("home");

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    return registerPwa(setPwaState);
  }, []);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      if (loaded.warning) return;
    }
    try {
      saveState(state);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось сохранить данные.");
    }
  }, [state, loaded.warning]);

  const profile = state.profile;
  const shopping = useMemo(() => buildShoppingList(state.days, recipes), [state.days]);
  const targetKcal = profile ? calculateTargetKcal(profile) : undefined;
  const minGoal = profile !== undefined && profile.customKcal === undefined && targetKcal !== undefined && targetKcal < 1200;
  const closeRecipe = useCallback(() => setSelectedRecipe(undefined), []);

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated: NutritionProfile = {
      ...profileDraft,
      allergies: parseList(allergiesText),
      excludedIngredients: parseList(excludedText),
    };
    const errors = validateProfile(updated);
    if (errors.length) {
      setMessage(errors.join(" "));
      return;
    }
    const restrictionsChanged = profile && (
      JSON.stringify(profile.allergies) !== JSON.stringify(updated.allergies) ||
      JSON.stringify(profile.excludedIngredients) !== JSON.stringify(updated.excludedIngredients)
    );
    setState((current) => ({
      ...current,
      profile: updated,
      ...(restrictionsChanged ? { days: [], checkedShoppingItems: [] } : {}),
    }));
    setMessage(restrictionsChanged ? "Ограничения обновлены. Прежнее меню очищено — составьте новый план." : "Профиль сохранён в этом браузере.");
  }

  function generatePlan() {
    if (!profile) {
      setMessage("Сначала заполните и сохраните профиль.");
      return;
    }
    try {
      const nextDays = buildMealPlan(recipes, profile, daysCount, mealsCount);
      setState((current) => ({
        ...current,
        days: nextDays,
        duration: daysCount,
        mealsPerDay: mealsCount,
        checkedShoppingItems: [],
      }));
      setActiveTab("plan");
      setActiveNavigation("menu");
      setMessage("Меню составлено по доступным структурированным рецептам. Данные демонстрационные.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось составить меню.");
    }
  }

  function replaceMeal(dayIndex: number, meal: PlannedDay["meals"][number]) {
    if (!profile) return;
    try {
      const days = replacePlannedMeal(state.days, dayIndex, meal.id, recipes, profile);
      const remainingShoppingIds = new Set(buildShoppingList(days, recipes).map((item) => `${item.ingredientId}:${item.unit}`));
      setState((current) => ({
        ...current,
        days,
        checkedShoppingItems: current.checkedShoppingItems.filter((item) => remainingShoppingIds.has(item)),
      }));
      setMessage("Блюдо заменено, список покупок пересчитан.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось заменить блюдо.");
    }
  }

  function toggleShoppingItem(id: string) {
    setState((current) => ({
      ...current,
      checkedShoppingItems: current.checkedShoppingItems.includes(id)
        ? current.checkedShoppingItems.filter((item) => item !== id)
        : [...current.checkedShoppingItems, id],
    }));
  }

  function toggleFavorite(id: string) {
    setState((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((item) => item !== id)
        : [...current.favorites, id],
    }));
  }

  function navigateTo(destination: NavigationDestination) {
    setActiveNavigation(destination);
    if (destination === "shopping") setActiveTab("shopping");
    else if (destination === "menu") setActiveTab("plan");
    const target = destination === "home" ? "today"
      : destination === "menu" ? (state.days.length ? "results" : "menu")
        : destination === "shopping" ? "purchases" : "profile";
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.requestAnimationFrame(() => {
      const section = document.getElementById(target);
      if (!section) return;
      const headerBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0;
      const isMobile = window.matchMedia("(max-width: 700px)").matches;
      const desiredTop = isMobile ? headerBottom + 8 : 24;
      const top = window.scrollY + section.getBoundingClientRect().top - desiredTop;
      window.scrollTo({ top, behavior });
    });
  }

  function changeTab(tab: "plan" | "shopping") {
    setActiveTab(tab);
    setActiveNavigation(tab === "shopping" ? "shopping" : "menu");
  }

  async function installApplication() {
    if (!pwaState.installPrompt) return;
    setInstallBusy(true);
    try {
      const result = await promptInstall(pwaState.installPrompt);
      if (result === "accepted") setPwaState((current) => ({ ...current, installPrompt: undefined }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось открыть установку приложения.");
    } finally {
      setInstallBusy(false);
    }
  }

  async function activateUpdate() {
    try {
      await applyPwaUpdate();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось активировать обновление.");
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ем по плану — на главную" onClick={() => setActiveNavigation("home")}><span className="brand-mark">е</span><span>ем по плану<small>меню, которое подходит вам</small></span></a>
        <PrimaryNavigation active={activeNavigation} onNavigate={navigateTo} />
        {pwaState.installPrompt && <button className="top-cta install-cta" onClick={installApplication} disabled={installBusy}>{installBusy ? "Открываем…" : "Установить приложение"}</button>}
      </header>

      <TodayDashboard profile={profile} days={state.days} pwaState={pwaState} onRecipe={setSelectedRecipe} onNavigate={navigateTo} onInstall={installApplication} />

      {pwaState.updateReady && <div className="update-banner" role="status"><span>Доступна новая версия приложения.</span><button onClick={activateUpdate}>Обновить</button></div>}

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />ПЛАНИРОВАНИЕ ПИТАНИЯ БЕЗ СУЕТЫ</div>
          <h1>Хорошая неделя<br />начинается <em>с меню.</em></h1>
          <p>Соберите меню под себя, посмотрите КБЖУ блюд и получите список продуктов. Без сложных таблиц и случайных решений.</p>
          <a className="primary-button" href="#profile" onClick={() => setActiveNavigation("profile")}>Настроить мой план <span aria-hidden="true">→</span></a>
          <div className="hero-note"><span>✓</span> Расчёты понятны · план хранится в вашем браузере</div>
        </div>
        <div className="hero-visual" aria-label="Иллюстрация блюда">
          <div className="sun-shape" />
          <div className="food-card">
            <div className="food-topline"><span>НА СЕГОДНЯ</span><span className="live-dot" /> ПЛАН</div>
            <div className="bowl"><span className="bowl-leaf leaf-one" /><span className="bowl-leaf leaf-two" /><span className="bowl-tomato" /><span className="bowl-grain" /><span className="bowl-protein" /></div>
            <div className="food-card-bottom"><div><strong>Гречка с курицей</strong><span>Простой обед · 35 мин</span></div><div className="food-kcal">412<small>ккал</small></div></div>
          </div>
          <div className="floating-note"><span>✳</span> Планируйте в своём ритме</div>
          <div className="hero-stamp">ПРОСТО<br />И ПО ДЕЛУ</div>
        </div>
      </section>

      <section className="value-strip" aria-label="Возможности сервиса">
        <div><span className="strip-icon">01</span><p><strong>Меню под ваши цели</strong><small>План на 1, 3, 7 или 14 дней</small></p></div>
        <div><span className="strip-icon">02</span><p><strong>Рецепты с КБЖУ</strong><small>Расчёт из состава блюда</small></p></div>
        <div><span className="strip-icon">03</span><p><strong>Список покупок</strong><small>Ингредиенты без повторов</small></p></div>
        <div><span className="strip-icon">04</span><p><strong>Планируйте вместе</strong><small>Семейный режим — следующий этап</small></p></div>
      </section>

      <ProfileWorkspace
        profile={profile}
        profileDraft={profileDraft}
        setProfileDraft={setProfileDraft}
        allergiesText={allergiesText}
        setAllergiesText={setAllergiesText}
        excludedText={excludedText}
        setExcludedText={setExcludedText}
        daysCount={daysCount}
        setDaysCount={setDaysCount}
        mealsCount={mealsCount}
        setMealsCount={setMealsCount}
        targetKcal={targetKcal ?? 0}
        minGoal={minGoal}
        message={message}
        onSaveProfile={saveProfile}
        onGeneratePlan={generatePlan}
        onDismissMessage={() => setMessage("")}
      />

      <PlanSection
        state={state}
        shopping={shopping}
        targetKcal={targetKcal}
        activeTab={activeTab}
        onTabChange={changeTab}
        onRecipeSelect={setSelectedRecipe}
        onMealReplace={replaceMeal}
        onShoppingToggle={toggleShoppingItem}
        onReturnToPlan={() => changeTab("plan")}
      />

      <RecipeLibrary
        profile={profile}
        favorites={state.favorites}
        onFavoriteToggle={toggleFavorite}
        onRecipeSelect={setSelectedRecipe}
      />

      <footer className="footer"><a className="brand footer-brand" href="#top" onClick={() => setActiveNavigation("home")}><span className="brand-mark">е</span><span>ем по плану<small>планируйте с заботой о себе</small></span></a><p>Не медицинская система. Расчёты приблизительны, а данные рецептов в этой версии демонстрационные и не проверены.</p><a href="#profile" onClick={() => setActiveNavigation("profile")}>Настроить профиль ↑</a><span>© 2026</span></footer>

      <BottomNavigation active={activeNavigation} onNavigate={navigateTo} />
      {selectedRecipe && <RecipeDialog recipe={selectedRecipe} onClose={closeRecipe} />}
    </main>
  );
}
