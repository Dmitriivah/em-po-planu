import type { Dispatch, SetStateAction } from "react";

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type PwaState = {
  installPrompt?: InstallPromptEvent;
  installHelp: "ios" | "unsupported" | null;
  updateReady: boolean;
};

export function isIOSInstallCandidate(userAgent: string, platform: string, maxTouchPoints: number, standalone: boolean): boolean {
  if (standalone) return false;
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function registerPwa(setState: Dispatch<SetStateAction<PwaState>>): () => void {
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true);
  const canInstallIos = isIOSInstallCandidate(
    navigator.userAgent,
    navigator.platform,
    navigator.maxTouchPoints,
    standalone,
  );

  if (!window.isSecureContext || !("serviceWorker" in navigator)) {
    setState((current) => ({ ...current, installHelp: canInstallIos ? "ios" : "unsupported" }));
    return () => {};
  }

  let disposed = false;
  let registration: ServiceWorkerRegistration | undefined;
  let waitingWorker: ServiceWorker | undefined;
  let hasReloadedForUpdate = false;
  const wasAlreadyControlled = Boolean(navigator.serviceWorker.controller);

  const updateState = (update: Partial<PwaState>) => {
    if (!disposed) setState((current) => ({ ...current, ...update }));
  };
  const onControllerChange = () => {
    if (wasAlreadyControlled && !hasReloadedForUpdate) {
      hasReloadedForUpdate = true;
      window.location.reload();
    }
  };
  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault();
    updateState({ installPrompt: event as InstallPromptEvent, installHelp: null });
  };
  const onAppInstalled = () => updateState({ installPrompt: undefined, installHelp: null });

  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);

  void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
    .then((result) => {
      if (disposed) return;
      registration = result;
      if (registration.waiting && navigator.serviceWorker.controller) {
        waitingWorker = registration.waiting;
        updateState({ updateReady: true });
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration?.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            waitingWorker = registration?.waiting ?? undefined;
            updateState({ updateReady: Boolean(waitingWorker) });
          }
        });
      });
      void registration.update().catch((error: unknown) => {
        console.warn("Не удалось проверить обновление приложения.", error);
      });
    })
    .catch((error: unknown) => {
      console.warn("Не удалось включить офлайн-оболочку приложения.", error);
      updateState({ installHelp: canInstallIos ? "ios" : null });
    });

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  if (canInstallIos) updateState({ installHelp: "ios" });

  return () => {
    disposed = true;
    window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.removeEventListener("appinstalled", onAppInstalled);
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  };
}

export async function promptInstall(event: InstallPromptEvent): Promise<"accepted" | "dismissed"> {
  await event.prompt();
  const result = await event.userChoice;
  return result.outcome;
}

export async function applyPwaUpdate(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration?.waiting) throw new Error("Новое обновление уже активировано. Перезагрузите приложение.");
  registration.waiting.postMessage("SKIP_WAITING");
}
