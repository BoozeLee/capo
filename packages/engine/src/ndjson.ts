import type { ScaffoldEvent } from "@capo/core";

export function encodeEvent(event: ScaffoldEvent): string {
  return `${JSON.stringify(event)}\n`;
}

export function decodeEvent(line: string): ScaffoldEvent {
  return JSON.parse(line) as ScaffoldEvent;
}
