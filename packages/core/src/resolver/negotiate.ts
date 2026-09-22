import type { Selection, SitdownOption } from "../types/stack.js";
import type { TechId } from "../types/tech.js";

export function sitdownOptions(a: TechId, b: TechId): SitdownOption[] {
  return [
    { kind: "drop", id: a },
    { kind: "drop", id: b },
  ];
}

export function applySitdown(selection: Selection, option: SitdownOption): Selection {
  if (option.kind === "drop") {
    return { ...selection, crew: selection.crew.filter((id) => id !== option.id) };
  }
  return {
    ...selection,
    crew: selection.crew.map((id) => (id === option.from ? option.to : id)),
  };
}
