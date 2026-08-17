import { useEffect } from "react";
import { playCue, unlockAudio, type Cue } from "@/lib/sound";

const INTERACTIVE =
  "button, a[href], summary, [role='button'], [role='tab'], [role='menuitem'], [role='option'], [role='switch'], [data-sfx]";

const VALID: ReadonlySet<string> = new Set<Cue>([
  "click",
  "soft",
  "open",
  "close",
  "confirm",
  "deploy",
  "coin",
  "forge",
  "levelup",
  "error",
  "page",
]);

/**
 * The one place the whole app gets its click. A single delegated pointer
 * listener plays a tick for every interactive element — so "sound on clicking"
 * is universal without touching a hundred buttons. Any element can override its
 * cue (or opt out) with `data-sfx="confirm"` / `data-sfx="off"`. The first
 * gesture also unlocks the AudioContext, which browsers gate behind user input.
 */
export function SoundLayer() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      unlockAudio(); // any gesture primes the graph
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.(INTERACTIVE) as HTMLElement | null;
      if (!el) return;
      const flag = el.getAttribute("data-sfx");
      if (flag === "off") return;
      if ((el as HTMLButtonElement).disabled) return;
      if (el.getAttribute("aria-disabled") === "true") return;
      const cue: Cue = flag && VALID.has(flag) ? (flag as Cue) : "click";
      playCue(cue);
    };
    // capture so we hear the click even when handlers stopPropagation
    document.addEventListener("pointerdown", onDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, []);

  return null;
}
