import type { ScaffoldEvent } from "../types/events.js";

export interface ThemeMode {
  readonly gotommyguns?: boolean;
  readonly omerta?: boolean;
}

export function phaseLine(event: ScaffoldEvent, mode: ThemeMode): string | null {
  if (event.type === "step:failed") {
    return `💥 ${event.error.message}`;
  }
  if (event.type === "plan:failed") {
    return `💥 ${event.error.message}`;
  }

  if (mode.omerta) {
    return null;
  }

  if (mode.gotommyguns) {
    switch (event.type) {
      case "plan:start":
        return "🔫 LOADING THE CLIP... Andiamo!";
      case "step:start":
        return `🔫 ${event.step.label}`;
      case "plan:done":
        return "✅ BUSINESS HANDLED. No loose ends. Capisce?";
      default:
        return null;
    }
  }

  switch (event.type) {
    case "plan:start":
      return "🎩 Gathering the famiglia...";
    case "step:start":
      return `🤝 ${event.step.label}`;
    case "plan:done":
      return "✅ La famiglia is complete. Now go make us proud!";
    default:
      return null;
  }
}
