import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { bindCurtain, type CurtainOptions } from "@/lib/transition";
import { playCue } from "@/lib/sound";

type Phase = "in" | "hold" | "out";

interface Active {
  opts: CurtainOptions;
  phase: Phase;
  cover: number; // ms the curtain takes to draw across
  out: number; // ms it takes to lift away
}

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * The ashen curtain — a full-screen wipe for entering the realm or crossing to a
 * new place. Draws dark across the map (a keyframe so it animates on mount),
 * holds a sigil and a line at its darkest, then lifts to reveal. Honours
 * prefers-reduced-motion with a quick fade.
 */
export function Curtain() {
  const [active, setActive] = useState<Active | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    bindCurtain((o) => {
      if (busy.current) return; // one curtain at a time
      busy.current = true;
      const reduce = reducedMotion();
      const cover = reduce ? 160 : 420;
      const holdMs = o.holdMs ?? (reduce ? 220 : 540);
      const out = reduce ? 160 : 460;
      playCue("page");
      setActive({ opts: o, phase: "in", cover, out });
      timers.current.push(
        setTimeout(() => setActive((a) => (a ? { ...a, phase: "hold" } : a)), cover),
        setTimeout(() => setActive((a) => (a ? { ...a, phase: "out" } : a)), cover + holdMs),
        setTimeout(
          () => {
            setActive(null);
            busy.current = false;
          },
          cover + holdMs + out,
        ),
      );
    });
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      bindCurtain(null);
    };
  }, []);

  if (!active) return null;
  const { opts, phase } = active;
  const showLabel = phase === "hold";
  const anim =
    phase === "in"
      ? `curtain-draw ${active.cover}ms ${EASE} forwards`
      : phase === "out"
        ? `curtain-lift ${active.out}ms ${EASE} forwards`
        : undefined;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {/* the curtain body — dark ashen field that sweeps in and lifts away */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(120% 80% at 50% 20%, #241528 0%, #0b0713 55%, #060409 100%)",
          boxShadow: "inset 0 0 180px 40px #000",
          ...(anim ? { animation: anim } : null),
        }}
      >
        {/* embers rising through the dark */}
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute bottom-0 block h-1 w-1 rounded-full"
            style={{
              left: `${(i * 7.3 + 4) % 100}%`,
              background: i % 3 === 0 ? "#e8a24a" : "#c56a2e",
              opacity: 0.7,
              animation: `ember-rise ${1.4 + (i % 5) * 0.3}s ease-out ${(i % 7) * 0.12}s infinite`,
            }}
          />
        ))}
      </div>

      {/* the sigil and destination, revealed at the curtain's darkest */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-2 text-center transition-opacity duration-300",
          showLabel ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="font-display text-4xl text-gold drop-shadow-[0_2px_12px_#e8a24a55]">
          {opts.sigil ?? "⚔"}
        </span>
        {opts.label && (
          <span className="max-w-[80vw] font-display text-lg uppercase tracking-[0.28em] text-[#e7d7ac]">
            {opts.label}
          </span>
        )}
      </div>
    </div>
  );
}
