import { useMemo } from "react";

/** Fixed atmospheric backdrop: ember glow, vignette, grain and drifting sparks. */
export function AmbientStage() {
  const embers = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        left: (i * 37 + ((i * i) % 23)) % 100,
        delay: (i * 1.7) % 18,
        duration: 16 + ((i * 5) % 14),
        scale: 0.6 + ((i % 5) * 0.22),
      })),
    [],
  );

  return (
    <div className="ambient-stage" aria-hidden>
      <div className="ambient-grain" />
      {embers.map((e) => (
        <span
          key={e.id}
          className="ember"
          style={{
            left: `${e.left}%`,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            transform: `scale(${e.scale})`,
          }}
        />
      ))}
    </div>
  );
}
