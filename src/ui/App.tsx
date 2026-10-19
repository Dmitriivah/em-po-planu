import { useEffect, useMemo, useRef, useState } from "react";
import { buildMealPlan, calculateDayNutrition, getMealLabel, replacePlannedMeal, type PlannedDay } from "../domain/planning";
import { calculateBmr, calculateTargetKcal, calculateTdee, validateProfile, type Activity, type Goal, type Nutrition, type NutritionProfile } from "../domain/nutrition";
import { calculateRecipeNutrition, recipeMatchesRestrictions, recipes, type Recipe } from "../domain/recipes";
import { buildShoppingList } from "../domain/shopping";
import { loadState, saveState, type AppState } from "../domain/storage";
import { applyPwaUpdate, promptInstall, registerPwa, type PwaState } from "../pwa/register";

const activityOptions: { value: Activity; label: string }[] = [
  { value: "minimal", label: "Минимальная" },
  { value: "low", label: "Низкая" },
  { value: "moderate", label: "Средняя" },
  { value: "high", label: "Высокая" },
  { value: "very-high", label: "Очень высокая" },
];

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

function format(n: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(n);
}

function Metric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return <div className="metric"><span>{label}</span><strong>{format(value)}<small> {unit}</small></strong></div>;
}

function MacroLine({ nutrition }: { nutrition: Nutrition }) {
  return <div className="macro-line">{format(nutrition.kcal)} ккал <span>Б {nutrition.protein.toFixed(1)} г</span><span>Ж {nutrition.fat.toFixed(1)} г</span><span>У {nutrition.carbs.toFixed(1)} г</span></div>;
}

function NavigationIcon({ name }: { name: "home" | "menu" | "shopping" | "profile" }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    menu: <><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /><path d="M2 5h.01M2 12h.01M2 19h.01" /></>,
    shopping: <><path d="M3 4h2l2.2 11h10.9l2-8H6" /><circle cx="9" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | undefined>();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [pwaState, setPwaState] = useState<PwaState>({ installHelp: null, updateReady: false });
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installBusy, setInstallBusy] = useState(false);
  const [activeNavigation, setActiveNavigation] = useState<"home" | "menu" | "shopping" | "profile">("home");

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
  const visibleRecipes = useMemo(() => recipes.filter((recipe) => {
    const matchesSearch = `${recipe.name} ${recipe.ingredients.map((item) => item.name).join(" ")}`.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru"));
    return matchesSearch && (!profile || recipeMatchesRestrictions(recipe, [...profile.allergies, ...profile.excludedIngredients]));
  }), [profile, search]);

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const updated: NutritionProfile = { ...profileDraft, allergies: parseList(allergiesText), excludedIngredients: parseList(excludedText) };
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
      setState((current) => ({ ...current, days: nextDays, duration: daysCount, mealsPerDay: mealsCount, checkedShoppingItems: [] }));
      setActiveTab("plan");
      setMessage("Меню составлено по доступным структурированным рецептам.");
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
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function navigateTo(destination: "home" | "menu" | "shopping" | "profile") {
    setActiveNavigation(destination);
    if (destination === "shopping") setActiveTab("shopping");
    else if (destination === "menu") setActiveTab("plan");
    const target = destination === "home" ? "today" :
      destination === "menu" ? (state.days.length ? "results" : "menu") :
      destination === "shopping" ? "purchases" : "profile";
    window.requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }));
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

  const targetKcal = profile ? calculateTargetKcal(profile) : 0;
  const minGoal = profile?.customKcal === undefined && targetKcal < 1200;

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Ем по плану — на главную"><span className="brand-mark">е</span><span>ем по плану<small>меню, которое подходит вам</small></span></a>
        <nav aria-label="Основная навигация">
          <button className="nav-link" onClick={() => navigateTo("home")}>Главная</button><button className="nav-link" onClick={() => navigateTo("menu")}>Меню</button><button className="nav-link" onClick={() => navigateTo("shopping")}>Покупки</button><button className="nav-link" onClick={() => navigateTo("profile")}>Профиль</button>
        </nav>
        {pwaState.installPrompt && <button className="top-cta install-cta" onClick={installApplication} disabled={installBusy}>{installBusy ? "Открываем…" : "Установить приложение"}</button>}
      </header>

      <section className="mobile-dashboard" id="today" aria-labelledby="today-title">
        <div className="mobile-greeting"><div className="eyebrow">ВАШ РИТМ ПИТАНИЯ</div><h1 id="today-title">{profile ? `Здравствуйте, ${profile.name}` : "Спланируем ваш день?"}</h1><p>{state.days.length ? "Ваш план и полезные детали — под рукой." : "Соберите меню и сохраните его в удобном месте."}</p></div>
        {state.days.length > 0 ? (() => {
          const today = state.days[0];
          const nutrition = calculateDayNutrition(today, recipes);
          return <div className="mobile-today-card">
            <div className="mobile-today-heading"><div><span className="day-label">ВАШ ПЛАН</span><h2 id="today-summary-title">Сегодня · {today.dateLabel.toLowerCase()}</h2></div><span className="mobile-today-kcal">{format(nutrition.kcal)}<small>ккал</small></span></div>
            <div className="mobile-macro-grid"><span><strong>Б</strong> {nutrition.protein} г</span><span><strong>Ж</strong> {nutrition.fat} г</span><span><strong>У</strong> {nutrition.carbs} г</span></div>
            <div className="mobile-today-meals">{today.meals.map((meal) => {
              const recipe = recipes.find((item) => item.id === meal.recipeId);
              if (!recipe) return null;
              return <button className="mobile-today-meal" key={meal.id} onClick={() => setSelectedRecipe(recipe)}><span className="mobile-meal-icon">{meal.type === "breakfast" ? "☼" : meal.type === "lunch" ? "◒" : meal.type === "dinner" ? "◐" : "✳"}</span><span><small>{getMealLabel(meal.type)}</small><strong>{recipe.name}</strong></span><span className="mobile-meal-arrow" aria-hidden="true">↗</span></button>;
            })}</div>
            <button className="mobile-open-plan" onClick={() => navigateTo("menu")}>Открыть план <span aria-hidden="true">→</span></button>
          </div>;
        })() : <div className="mobile-empty-card"><span className="mobile-empty-mark">✳</span><h2>Ваш план начнётся здесь</h2><p>Заполните профиль, чтобы собрать подходящее меню.</p><button className="primary-button" onClick={() => navigateTo("profile")}>Настроить профиль <span aria-hidden="true">→</span></button></div>}
        {(pwaState.installPrompt || pwaState.installHelp === "ios") && <div className="install-card">
          <span className="install-mark"><NavigationIcon name="home" /></span>
          <div><strong>{pwaState.installHelp === "ios" ? "Добавьте приложение на экран «Домой»" : "Пусть меню будет под рукой"}</strong><p>{pwaState.installHelp === "ios" ? "Установка на iPhone выполняется через меню Safari." : "Установите приложение для быстрого доступа с главного экрана."}</p></div>
          {pwaState.installPrompt
            ? <button className="install-action" disabled={installBusy} onClick={installApplication}>Установить</button>
            : <button className="install-action" aria-expanded={installHelpOpen} onClick={() => setInstallHelpOpen((open) => !open)}>{installHelpOpen ? "Скрыть" : "Как добавить"}</button>}
          {installHelpOpen && <p className="ios-install-help">Откройте эту страницу в Safari, нажмите «Поделиться», выберите «На экран Домой» и подтвердите добавление. В Chrome для iOS доступность этого пункта отличается.</p>}
        </div>}
        {pwaState.installHelp === "unsupported" && typeof window !== "undefined" && !window.isSecureContext && <p className="secure-context-note">Установка и офлайн-оболочка доступны через HTTPS или на локальном устройстве разработки.</p>}
      </section>

      {pwaState.updateReady && <div className="update-banner" role="status"><span>Доступна новая версия приложения.</span><button onClick={activateUpdate}>Обновить</button></div>}

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" />ПЛАНИРОВАНИЕ ПИТАНИЯ БЕЗ СУЕТЫ</div>
          <h1>Хорошая неделя<br />начинается <em>с меню.</em></h1>
          <p>Соберите меню под себя, посмотрите КБЖУ блюд и получите список продуктов. Без сложных таблиц и случайных решений.</p>
          <a className="primary-button" href="#profile">Настроить мой план <span aria-hidden="true">→</span></a>
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

      <section className="work-area" id="profile">
        <div className="section-heading">
          <div><div className="eyebrow">ВАША ТОЧКА ОТСЧЁТА</div><h2>Сначала — немного о вас</h2></div>
          <p>Нужны только данные для примерной оценки энергозатрат. Это не медицинская рекомендация.</p>
        </div>
        <div className="workspace-grid">
          <form className="panel profile-panel" onSubmit={saveProfile}>
            <div className="panel-heading"><span className="panel-step">01</span><div><h3>Профиль питания</h3><p>Поля со звёздочкой обязательны</p></div></div>
            <label>Имя или обозначение<input required value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} placeholder="Например, Аня" autoComplete="name" /></label>
            <div className="form-row">
              <label>Возраст, лет<input type="number" min="18" max="100" value={profileDraft.age} onChange={(event) => setProfileDraft({ ...profileDraft, age: Number(event.target.value) })} /></label>
              <label>Вариант формулы<select value={profileDraft.sex} onChange={(event) => setProfileDraft({ ...profileDraft, sex: event.target.value as NutritionProfile["sex"] })}><option value="female">Женский</option><option value="male">Мужской</option></select></label>
            </div>
            <div className="form-row">
              <label>Рост, см<input type="number" min="120" max="230" value={profileDraft.heightCm} onChange={(event) => setProfileDraft({ ...profileDraft, heightCm: Number(event.target.value) })} /></label>
              <label>Вес, кг<input type="number" min="30" max="300" step="0.1" value={profileDraft.weightKg} onChange={(event) => setProfileDraft({ ...profileDraft, weightKg: Number(event.target.value) })} /></label>
            </div>
            <label>Уровень активности<select value={profileDraft.activity} onChange={(event) => setProfileDraft({ ...profileDraft, activity: event.target.value as Activity })}>{activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label>Цель питания<select value={profileDraft.goal} onChange={(event) => setProfileDraft({ ...profileDraft, goal: event.target.value as Goal })}><option value="maintain">Поддержание массы</option><option value="lose">Постепенное снижение</option><option value="gain">Постепенное увеличение</option></select></label>
            <label>Своя цель, ккал <span className="optional">необязательно; пусто — расчётная цель</span><input type="number" min="1200" max="6000" step="10" value={profileDraft.customKcal ?? ""} onChange={(event) => {
              if (event.target.value === "") {
                const { customKcal: _customKcal, ...automaticProfile } = profileDraft;
                setProfileDraft(automaticProfile);
              } else {
                setProfileDraft({ ...profileDraft, customKcal: Number(event.target.value) });
              }
            }} /></label>
            <label>Аллергены <span className="optional">через запятую</span><input value={allergiesText} onChange={(event) => setAllergiesText(event.target.value)} placeholder="Например: молоко, яйцо" /></label>
            <label>Другие исключения <span className="optional">через запятую</span><input value={excludedText} onChange={(event) => setExcludedText(event.target.value)} placeholder="Например: рыба, овсянка" /></label>
            <button className="secondary-button full-width" type="submit">Сохранить профиль <span aria-hidden="true">✓</span></button>
          </form>

          <div className="right-column">
            <section className="panel goal-panel">
              <div className="panel-heading"><span className="panel-step coral-step">02</span><div><h3>Ориентир на день</h3><p>{profile ? "Расчёт по формуле Миффлина — Сан Жеора" : "Заполните профиль, чтобы увидеть расчёт"}</p></div></div>
              {profile ? <>
                <div className="goal-number">{format(targetKcal)}<span>ккал / день</span></div>
                <div className="metrics-grid"><Metric label="Базовый обмен" value={calculateBmr(profile)} unit="ккал" /><Metric label="Расход с активностью" value={calculateTdee(profile)} unit="ккал" /></div>
                <p className="subtle-note">Цель приблизительная: {profile.customKcal ? "используется ваше значение." : profile.goal === "lose" ? "расчётный дефицит 10%." : profile.goal === "gain" ? "расчётный избыток 10%." : "поддержание расчётного расхода."} Фактические потребности индивидуальны.</p>
                {minGoal && <p className="warning-note">Расчётная цель ниже встроенного минимума 1 200 ккал. Этот MVP не составляет меню для такой цели: измените цель с осторожностью.</p>}
              </> : <div className="empty-state">Ваш расчёт появится здесь после сохранения профиля.</div>}
            </section>

            <section className="panel menu-builder" id="menu">
              <div className="panel-heading"><span className="panel-step">03</span><div><h3>Соберите план</h3><p>Меню из структурированных рецептов каталога</p></div></div>
              <div className="form-row">
                <label>Продолжительность<select value={daysCount} onChange={(event) => setDaysCount(Number(event.target.value))}><option value={1}>1 день</option><option value={3}>3 дня</option><option value={7}>7 дней</option><option value={14}>14 дней</option></select></label>
                <label>Приёмов пищи<select value={mealsCount} onChange={(event) => setMealsCount(Number(event.target.value))}>{[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} в день</option>)}</select></label>
              </div>
              <button className="primary-button full-width" disabled={!profile || minGoal} onClick={generatePlan}>Составить меню <span aria-hidden="true">→</span></button>
              <div className="builder-footnote"><span>✳</span> Подбор детерминированный. Ограничения не снимаются автоматически.</div>
            </section>

            {message && <div className="status-message" role="status">{message}<button aria-label="Закрыть сообщение" onClick={() => setMessage("")}>×</button></div>}
          </div>
        </div>
      </section>

      <section className="results-section" id="results">
        <div className="section-heading results-heading">
          <div><div className="eyebrow">ВАШ ПЛАН</div><h2>{state.days.length ? "На столе — ваш план" : "Пусть меню работает на вас"}</h2></div>
          {state.days.length > 0 && <div className="tabs" role="tablist"><button role="tab" aria-selected={activeTab === "plan"} className={activeTab === "plan" ? "active" : ""} onClick={() => setActiveTab("plan")}>Меню</button><button role="tab" aria-selected={activeTab === "shopping"} className={activeTab === "shopping" ? "active" : ""} onClick={() => setActiveTab("shopping")}>Покупки <span>{shopping.length}</span></button></div>}
        </div>
        {activeTab === "plan" && !state.days.length ? <div className="empty-plan"><div className="empty-illustration">✳</div><h3>Ваш план появится здесь</h3><p>Сохраните профиль и выберите длительность меню. Рецепты, расчёты и список покупок будут связаны между собой.</p></div> :
          activeTab === "plan" ? <div className="days-grid">{state.days.map((day, dayIndex) => {
            const nutrition = calculateDayNutrition(day, recipes);
            const difference = nutrition.kcal - targetKcal;
            return <article className="day-card" key={day.dateLabel}>
              <div className="day-header"><div><span className="day-label">ВАШ ПЛАН</span><h3>{day.dateLabel}</h3></div><span className="day-total">{format(nutrition.kcal)} <small>ккал</small></span></div>
              <p className="target-deviation">{difference === 0 ? "Точно к расчётному ориентиру" : `${difference < 0 ? "Ниже" : "Выше"} расчётного ориентира на ${format(Math.abs(difference))} ккал`}</p>
              <div className="day-macros"><span>Б {nutrition.protein} г</span><span>Ж {nutrition.fat} г</span><span>У {nutrition.carbs} г</span></div>
              <div className="meal-list">{day.meals.map((meal) => {
                const recipe = recipes.find((item) => item.id === meal.recipeId);
                if (!recipe) return null;
                const recipeNutrition = calculateRecipeNutrition(recipe);
                return <div className="meal-row" key={meal.id}>
                  <span className="meal-marker">{meal.type === "breakfast" ? "☼" : meal.type === "lunch" ? "◒" : meal.type === "dinner" ? "◐" : "✳"}</span>
                  <div className="meal-info"><small>{getMealLabel(meal.type)}</small><button className="recipe-link" onClick={() => setSelectedRecipe(recipe)}>{recipe.name}</button><span>{format(recipeNutrition.kcal)} ккал · {recipe.prepMinutes + recipe.cookMinutes} мин</span></div>
                  <button className="icon-button" aria-label={`Заменить блюдо: ${recipe.name}`} title="Заменить блюдо" onClick={() => replaceMeal(dayIndex, meal)}>↻</button>
                </div>;
              })}</div>
              {nutrition.kcal < targetKcal * 0.75 && <div className="warning-note compact-warning">Доступный каталог не покрывает расчётную цель. Не считайте этот план полноценным рационом.</div>}
            </article>;
          })}          </div> : <div className="shopping-layout" id="purchases">
            <div className="panel shopping-panel">
              <div className="shopping-title"><div><h3>Что купить</h3><p>Количество рассчитано по порциям рецептов</p></div><span className="shopping-count">{shopping.length - state.checkedShoppingItems.filter((item) => shopping.some((entry) => `${entry.ingredientId}:${entry.unit}` === item)).length} осталось</span></div>
              {!shopping.length ? <div className="shopping-empty"><span aria-hidden="true">✓</span><strong>Список пока пуст</strong><p>Составьте меню — ингредиенты появятся здесь.</p></div> : <ul className="shopping-list">{shopping.map((item) => {
                const key = `${item.ingredientId}:${item.unit}`;
                const checked = state.checkedShoppingItems.includes(key);
                return <li key={key} className={checked ? "checked" : ""}><label><input type="checkbox" checked={checked} onChange={() => toggleShoppingItem(key)} /><span className="checkmark" /><span className="shopping-name">{item.name}</span><span className="shopping-amount">{new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(item.amount)} {item.unit}</span></label></li>;
              })}</ul>}
              <div className="price-notice"><strong>Стоимость пока не рассчитана</strong><p>В каталоге нет проверенных цен и фасовок. Сумма покупки не показывается, чтобы не создавать ложную оценку.</p></div>
            </div>
            <aside className="panel shopping-side"><span className="side-icon">↗</span><h3>Список обновляется вместе с меню</h3><p>Замените блюдо — ингредиенты пересчитаются. Цены появятся после создания проверенного каталога товаров и упаковок.</p><button className="text-button" onClick={() => setActiveTab("plan")}>Вернуться к меню <span aria-hidden="true">→</span></button></aside>
          </div>}
      </section>

      <section className="recipe-library">
        <div className="section-heading"><div><div className="eyebrow">КАТАЛОГ РЕЦЕПТОВ</div><h2>Идеи для вашего стола</h2></div><label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Рецепт или ингредиент" aria-label="Поиск рецептов и ингредиентов" /></label></div>
        <div className="recipe-grid">{visibleRecipes.map((recipe, index) => <article className={`recipe-card recipe-tone-${index % 4}`} key={recipe.id}><div className="recipe-art"><span className="recipe-art-symbol">{["◉", "◒", "✳", "◈"][index % 4]}</span><span className="recipe-category">{recipe.category}</span><button className={`favorite-button ${favorites.includes(recipe.id) ? "favorited" : ""}`} aria-label={favorites.includes(recipe.id) ? "Убрать из избранного" : "Добавить в избранное"} onClick={() => toggleFavorite(recipe.id)}>{favorites.includes(recipe.id) ? "♥" : "♡"}</button></div><div className="recipe-card-body"><div className="recipe-meta">{getMealLabel(recipe.mealType)} <span>·</span> {recipe.prepMinutes + recipe.cookMinutes} мин</div><button className="recipe-card-title" onClick={() => setSelectedRecipe(recipe)}>{recipe.name}</button><MacroLine nutrition={calculateRecipeNutrition(recipe)} /><span className="demo-label">Демонстрационный рецепт · значения не проверены</span></div></article>)}</div>
        {visibleRecipes.length === 0 && <div className="empty-filter">Подходящих рецептов не найдено. Измените запрос или проверьте ограничения профиля.</div>}
        {favorites.length > 0 && <p className="favorites-summary">Избранное в этой сессии: {favorites.length} рецепта. Между перезапусками страницы оно пока не сохраняется.</p>}
      </section>

      <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark">е</span><span>ем по плану<small>планируйте с заботой о себе</small></span></a><p>Не медицинская система. Расчёты приблизительны, а данные рецептов в этой версии демонстрационные и не проверены.</p><a href="#profile">Настроить профиль ↑</a><span>© 2026</span></footer>

      <nav className="bottom-navigation" aria-label="Основная навигация">
        {([
          ["home", "Главная", "home"],
          ["menu", "Меню", "menu"],
          ["shopping", "Покупки", "shopping"],
          ["profile", "Профиль", "profile"],
        ] as const).map(([destination, label, icon]) => {
          const selected = activeNavigation === destination;
          return <button key={destination} className={`bottom-nav-item ${selected ? "selected" : ""}`} aria-current={selected ? "page" : undefined} onClick={() => navigateTo(destination)}><NavigationIcon name={icon} /><span>{label}</span></button>;
        })}
      </nav>

      {selectedRecipe && <div className="modal-backdrop" role="presentation" onClick={() => setSelectedRecipe(undefined)}><section className="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" aria-label="Закрыть рецепт" onClick={() => setSelectedRecipe(undefined)}>×</button><div className="eyebrow">{getMealLabel(selectedRecipe.mealType)} · {selectedRecipe.category}</div><h2 id="recipe-modal-title">{selectedRecipe.name}</h2><p>{selectedRecipe.description}</p><MacroLine nutrition={calculateRecipeNutrition(selectedRecipe)} />
        <p className="demo-label modal-demo">{selectedRecipe.sourceNote}</p>
        <h3>Ингредиенты · на {selectedRecipe.servings} порцию</h3><ul className="modal-ingredients">{selectedRecipe.ingredients.map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.amount} {item.unit}</strong><small>{item.dataNote}</small></li>)}</ul>
        <h3>Приготовление</h3><ol className="steps-list">{selectedRecipe.steps.map((step) => <li key={step}>{step}</li>)}</ol><p className="subtle-note">Данные пищевой ценности приблизительные. Аллергены и возможное перекрёстное загрязнение могут быть указаны не полностью.</p>
      </section></div>}
    </main>
  );
}
