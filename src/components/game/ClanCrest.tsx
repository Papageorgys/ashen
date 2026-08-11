import { memo } from "react";
import type { Crest, CrestCharge } from "@/lib/game/identity";

function Charge({ id, color }: { id: CrestCharge; color: string }) {
  const s = { fill: color, stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.8 };
  switch (id) {
    case "wolf":
      return (
        <path
          {...s}
          d="M50 26 L40 34 L36 30 L36 40 C36 52 42 58 50 66 C58 58 64 52 64 40 L64 30 L60 34 Z M44 42 a2 2 0 1 0 .1 0 M56 42 a2 2 0 1 0 .1 0 M50 50 L46 55 L54 55 Z"
        />
      );
    case "raven":
      return (
        <path
          {...s}
          d="M30 40 C40 28 60 28 70 40 C62 38 58 42 56 48 L64 62 L50 54 L36 62 L44 48 C42 42 38 38 30 40 Z"
        />
      );
    case "tower":
      return (
        <path
          {...s}
          d="M38 32 h6 v4 h4 v-4 h4 v4 h4 v-4 h6 v10 h-4 v24 h-16 v-24 h-4 Z M46 50 h8 v14 h-8 Z"
        />
      );
    case "blade":
      return (
        <path
          {...s}
          d="M50 22 L54 32 V54 h-8 V32 Z M40 56 h20 v4 h-20 Z M48 60 h4 v14 h-4 Z M45 74 h10 v3 h-10 Z"
        />
      );
    case "flame":
      return (
        <path
          {...s}
          d="M50 22 C58 34 66 40 62 52 C60 62 54 68 50 70 C46 68 40 62 38 52 C34 40 42 34 50 22 Z"
        />
      );
    case "star":
      return (
        <path
          {...s}
          d="M50 22 L56 42 L76 42 L60 54 L66 74 L50 62 L34 74 L40 54 L24 42 L44 42 Z"
        />
      );
    case "serpent":
      return (
        <path
          {...s}
          d="M32 66 C32 48 50 52 50 40 C50 32 62 30 66 38 C60 36 56 38 56 42 C56 54 38 52 38 66 Z M64 34 a3 3 0 1 0 .1 0"
        />
      );
    case "antlers":
      return (
        <path
          {...s}
          d="M48 70 h4 V48 l10-8 3 4 -9 8 v-8 l8-8 3 4 -8 8 M48 48 l-10-8 -3 4 9 8 v-8 l-8-8 -3 4 8 8"
        />
      );
    case "chalice":
      return (
        <path
          {...s}
          d="M36 30 h28 c0 14 -6 20 -10 22 v10 h8 v4 h-24 v-4 h8 v-10 c-4 -2 -10 -8 -10 -22 Z"
        />
      );
    case "hammer":
      return (
        <path
          {...s}
          d="M34 32 h32 v14 h-12 v28 h-8 V46 h-12 Z"
        />
      );
  }
}

function shapePath(shape: Crest["shape"]) {
  switch (shape) {
    case "heater":
      return "M12 8 H88 V50 C88 72 68 86 50 94 C32 86 12 72 12 50 Z";
    case "kite":
      return "M50 4 C74 14 84 30 84 46 C84 70 66 88 50 96 C34 88 16 70 16 46 C16 30 26 14 50 4 Z";
    case "round":
      return "M50 6 A44 44 0 1 1 49.9 6 Z";
    case "banner":
      return "M14 6 H86 V80 L50 96 L14 80 Z";
  }
}

export const ClanCrest = memo(function ClanCrest({
  crest,
  className = "",
}: {
  crest: Crest;
  className?: string;
}) {
  const clip = `crestclip-${crest.shape}`;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Clan crest">
      <defs>
        <clipPath id={clip}>
          <path d={shapePath(crest.shape)} />
        </clipPath>
        <linearGradient id="crestSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="60%" stopColor="rgba(0,0,0,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clip})`}>
        <rect width="100" height="100" fill={crest.field} />
        {crest.division === "perFess" && (
          <rect y="50" width="100" height="50" fill={crest.accent} opacity="0.35" />
        )}
        {crest.division === "perPale" && (
          <rect x="50" width="50" height="100" fill={crest.accent} opacity="0.35" />
        )}
        {crest.division === "perBend" && (
          <path d="M0 0 L100 0 L0 100 Z" fill={crest.accent} opacity="0.35" />
        )}
        {crest.division === "chevron" && (
          <path d="M0 100 L50 40 L100 100 Z" fill={crest.accent} opacity="0.35" />
        )}
        <Charge id={crest.charge} color={crest.accent} />
        <rect width="100" height="100" fill="url(#crestSheen)" />
      </g>
      <path
        d={shapePath(crest.shape)}
        fill="none"
        stroke="rgba(216,185,105,0.85)"
        strokeWidth="3"
      />
    </svg>
  );
});
