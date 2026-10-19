import type { Nutrition } from "../domain/nutrition";

export type NavigationDestination = "home" | "menu" | "shopping" | "profile";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}

export function Metric({ label, value, unit }: { label: string; value: number; unit: string }) {
  return <div className="metric"><span>{label}</span><strong>{formatNumber(value)}<small> {unit}</small></strong></div>;
}

export function MacroLine({ nutrition }: { nutrition: Nutrition }) {
  return <div className="macro-line">{formatNumber(nutrition.kcal)} ккал <span>Б {nutrition.protein.toFixed(1)} г</span><span>Ж {nutrition.fat.toFixed(1)} г</span><span>У {nutrition.carbs.toFixed(1)} г</span></div>;
}

export function NavigationIcon({ name }: { name: NavigationDestination }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>,
    menu: <><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /><path d="M2 5h.01M2 12h.01M2 19h.01" /></>,
    shopping: <><path d="M3 4h2l2.2 11h10.9l2-8H6" /><circle cx="9" cy="19" r="1.3" /><circle cx="17" cy="19" r="1.3" /></>,
    profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
