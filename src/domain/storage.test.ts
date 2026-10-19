import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NutritionProfile } from "./nutrition";
import type { AppState } from "./storage";
import { loadState, saveState } from "./storage";

const storageKey = "em-po-planu:v1";

const profile: NutritionProfile = {
  name: "Сохранённый профиль",
  age: 30,
  sex: "female",
  heightCm: 165,
  weightKg: 65,
  activity: "moderate",
  goal: "maintain",
  allergies: [],
  excludedIngredients: [],
};

const legacyState: Omit<AppState, "favorites"> = {
  profile,
  days: [{ dateLabel: "День 1", meals: [{ id: "0-0", recipeId: "oatmeal-apple", type: "breakfast" }] }],
  duration: 1,
  mealsPerDay: 2,
  checkedShoppingItems: ["oats:g"],
};

function createStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, String(value)),
  };
}

describe("local application state", () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal("localStorage", storage);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("restores the existing profile, plan and shopping checks when upgrading a state without favorites", () => {
    storage.setItem(storageKey, JSON.stringify(legacyState));

    const loaded = loadState();

    expect(loaded).toEqual({ state: { ...legacyState, favorites: [] } });
    expect(storage.getItem(storageKey)).toBe(JSON.stringify(legacyState));
  });

  it("persists favorites alongside the current state and restores them after a reload", () => {
    const state: AppState = { ...legacyState, favorites: ["oatmeal-apple"] };

    saveState(state);

    expect(loadState()).toEqual({ state });
    expect(JSON.parse(storage.getItem(storageKey) ?? "{}").checkedShoppingItems).toEqual(["oats:g"]);
  });

  it("resets only corrupted favorites and preserves the other saved data without rewriting it on load", () => {
    const damagedState = { ...legacyState, favorites: "not-a-list" };
    const raw = JSON.stringify(damagedState);
    storage.setItem(storageKey, raw);

    const loaded = loadState();

    expect(loaded.state).toEqual({ ...legacyState, favorites: [] });
    expect(loaded.warning).toContain("Профиль, меню и отметки покупок сохранены");
    expect(storage.getItem(storageKey)).toBe(raw);
  });

  it("leaves the complete saved state untouched when its JSON cannot be parsed", () => {
    storage.setItem(storageKey, "{");

    const loaded = loadState();

    expect(loaded.state).toMatchObject({ days: [], checkedShoppingItems: [], favorites: [] });
    expect(loaded.state.profile).toBeUndefined();
    expect(loaded.warning).toBeTruthy();
    expect(storage.getItem(storageKey)).toBe("{");
  });
});
