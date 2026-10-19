import type { NavigationDestination } from "./Display";
import { NavigationIcon } from "./Display";

const destinations: { id: NavigationDestination; label: string }[] = [
  { id: "home", label: "Главная" },
  { id: "menu", label: "Меню" },
  { id: "shopping", label: "Покупки" },
  { id: "profile", label: "Профиль" },
];

type NavigationProps = {
  active: NavigationDestination;
  onNavigate: (destination: NavigationDestination) => void;
};

export function PrimaryNavigation({ active, onNavigate }: NavigationProps) {
  return (
    <nav aria-label="Основная навигация">
      {destinations.map(({ id, label }) => (
        <button
          key={id}
          className={`nav-link${active === id ? " active" : ""}`}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

export function BottomNavigation({ active, onNavigate }: NavigationProps) {
  return (
    <nav className="bottom-navigation" aria-label="Основная навигация">
      {destinations.map(({ id, label }) => (
        <button
          key={id}
          className={`bottom-nav-item${active === id ? " selected" : ""}`}
          aria-current={active === id ? "page" : undefined}
          onClick={() => onNavigate(id)}
        >
          <NavigationIcon name={id} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
