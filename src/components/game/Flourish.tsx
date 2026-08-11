import { useEffect, useRef, useState } from "react";

export type FlourishEvent = { id: number; title: string; subtitle: string };

/** Full-screen gilded celebration for milestone moments. */
export function Flourish({ event }: { event: FlourishEvent | null }) {
  const [current, setCurrent] = useState<FlourishEvent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!event) return;
    setCurrent(event);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCurrent(null), 2800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [event]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-background/55 flourish-bloom" />
      <div className="relative flourish-bloom text-center">
        <span className="flourish-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/50" />
        <span
          className="flourish-ring absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/30"
          style={{ animationDelay: "0.25s" }}
        />
        <div className="px-8">
          <div className="l2-rule mx-auto mb-4 w-56" />
          <h2 className="gilded font-display text-4xl sm:text-6xl">{current.title}</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.35em] text-muted-foreground">
            {current.subtitle}
          </p>
          <div className="l2-rule mx-auto mt-4 w-56" />
        </div>
      </div>
    </div>
  );
}
