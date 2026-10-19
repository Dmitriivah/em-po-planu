import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { calculateBmr, calculateTdee, type Activity, type Goal, type NutritionProfile } from "../domain/nutrition";
import { Metric, formatNumber } from "./Display";

const activityOptions: { value: Activity; label: string }[] = [
  { value: "minimal", label: "Минимальная" },
  { value: "low", label: "Низкая" },
  { value: "moderate", label: "Средняя" },
  { value: "high", label: "Высокая" },
  { value: "very-high", label: "Очень высокая" },
];

type ProfileWorkspaceProps = {
  profile?: NutritionProfile;
  profileDraft: NutritionProfile;
  setProfileDraft: Dispatch<SetStateAction<NutritionProfile>>;
  allergiesText: string;
  setAllergiesText: Dispatch<SetStateAction<string>>;
  excludedText: string;
  setExcludedText: Dispatch<SetStateAction<string>>;
  daysCount: number;
  setDaysCount: Dispatch<SetStateAction<number>>;
  mealsCount: number;
  setMealsCount: Dispatch<SetStateAction<number>>;
  targetKcal: number;
  minGoal: boolean;
  message: string;
  onSaveProfile: FormEventHandler<HTMLFormElement>;
  onGeneratePlan: () => void;
  onDismissMessage: () => void;
};

export function ProfileWorkspace({
  profile,
  profileDraft,
  setProfileDraft,
  allergiesText,
  setAllergiesText,
  excludedText,
  setExcludedText,
  daysCount,
  setDaysCount,
  mealsCount,
  setMealsCount,
  targetKcal,
  minGoal,
  message,
  onSaveProfile,
  onGeneratePlan,
  onDismissMessage,
}: ProfileWorkspaceProps) {
  return (
    <section className="work-area" id="profile">
      <div className="section-heading">
        <div><div className="eyebrow">ВАША ТОЧКА ОТСЧЁТА</div><h2>Сначала — немного о вас</h2></div>
        <p>Нужны только данные для примерной оценки энергозатрат. Это не медицинская рекомендация.</p>
      </div>
      <div className="workspace-grid">
        <form className="panel profile-panel" onSubmit={onSaveProfile}>
          <div className="panel-heading"><span className="panel-step">01</span><div><h3>Профиль питания</h3><p>Поля со звёздочкой обязательны</p></div></div>
          <label>Имя или обозначение *<input required value={profileDraft.name} onChange={(event) => setProfileDraft({ ...profileDraft, name: event.target.value })} placeholder="Например, Аня" autoComplete="name" /></label>
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
              <div className="goal-number">{formatNumber(targetKcal)}<span>ккал / день</span></div>
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
            <button className="primary-button full-width" disabled={!profile || minGoal} onClick={onGeneratePlan}>Составить меню <span aria-hidden="true">→</span></button>
            <div className="builder-footnote"><span>✳</span> Подбор детерминированный. Ограничения не снимаются автоматически.</div>
          </section>

          {message && <div className="status-message" role="status">{message}<button aria-label="Закрыть сообщение" onClick={onDismissMessage}>×</button></div>}
        </div>
      </div>
    </section>
  );
}
