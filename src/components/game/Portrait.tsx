import { memo, useId } from "react";
import {
  BG_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  type Portrait as PortraitData,
} from "@/lib/game/identity";
import { CLASS_BY_ID } from "@/lib/game/data";

/**
 * Engraved champion bust — inked woodcut on parchment.
 *
 * Race decides the skull and the ears; the class's armour type and role decide
 * the shoulders and the headgear. The player's own sliders (hair, brows, eyes,
 * beard, marking) still sit on top, so the editor never fights the lore.
 */

type RaceKey =
  | "hyunan"
  | "sylvani"
  | "nocturi"
  | "grakhar"
  | "durgan"
  | "kaemari";

interface Anatomy {
  /** half-width and half-height of the skull */
  rx: number;
  ry: number;
  /** jaw spread: 0 narrow, 1 broad */
  jaw: number;
  ears: "plain" | "long" | "swept" | "feathered";
  tusks?: boolean;
  brow?: boolean;
  darkSclera?: boolean;
  wing?: boolean;
  /** beard always drawn even when the slider says none */
  alwaysBeard?: boolean;
}

const ANATOMY: Record<RaceKey, Anatomy> = {
  hyunan: { rx: 19, ry: 22.5, jaw: 0.5, ears: "plain" },
  sylvani: { rx: 17, ry: 23.5, jaw: 0.22, ears: "long" },
  nocturi: { rx: 17.5, ry: 23, jaw: 0.3, ears: "swept", darkSclera: true },
  grakhar: { rx: 21.5, ry: 22, jaw: 1, ears: "plain", tusks: true, brow: true },
  durgan: { rx: 21, ry: 20.5, jaw: 0.9, ears: "plain", alwaysBeard: true },
  kaemari: { rx: 17.5, ry: 22, jaw: 0.25, ears: "feathered", wing: true },
};

const INK = "#241a12";
const INK_SOFT = "rgba(36,26,18,0.55)";
const PAPER = "#e8dbbd";
const GOLD = "#c8a44e";

function anatomyFor(raceId?: string): Anatomy {
  return ANATOMY[(raceId as RaceKey) ?? "hyunan"] ?? ANATOMY.hyunan;
}

/** Shoulder plate + headgear drawn from the class's armour discipline. */
function Harness({
  armor,
  role,
  metal,
}: {
  armor: string;
  role: string;
  metal: string;
}) {
  if (armor === "heavy") {
    return (
      <g>
        <path d="M8 100 C12 80 30 71 50 71 C70 71 88 80 92 100 Z" fill={metal} />
        <path d="M8 100 C12 80 30 71 50 71 C70 71 88 80 92 100 Z" fill="none" stroke={INK} strokeWidth="1.6" />
        {/* pauldrons */}
        <path d="M10 98 C10 82 20 74 30 74 C34 80 34 90 32 100 Z" fill={metal} stroke={INK} strokeWidth="1.4" />
        <path d="M90 98 C90 82 80 74 70 74 C66 80 66 90 68 100 Z" fill={metal} stroke={INK} strokeWidth="1.4" />
        <path d="M14 92 C18 84 24 80 29 79" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        <path d="M86 92 C82 84 76 80 71 79" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        {/* gorget */}
        <path d="M40 72 Q50 80 60 72" fill="none" stroke={INK} strokeWidth="1.6" />
      </g>
    );
  }
  if (armor === "robe") {
    return (
      <g>
        <path d="M10 100 C16 80 32 72 50 72 C68 72 84 80 90 100 Z" fill={metal} />
        <path d="M10 100 C16 80 32 72 50 72 C68 72 84 80 90 100 Z" fill="none" stroke={INK} strokeWidth="1.6" />
        {/* stole */}
        <path d="M42 74 L36 100" stroke={INK} strokeWidth="1.4" fill="none" />
        <path d="M58 74 L64 100" stroke={INK} strokeWidth="1.4" fill="none" />
        <path d="M50 74 Q44 86 46 100" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        <path d="M50 74 Q56 86 54 100" fill="none" stroke={INK_SOFT} strokeWidth="1" />
        {role === "mender" && (
          <path d="M34 96 h32" stroke={GOLD} strokeWidth="1.4" fill="none" />
        )}
      </g>
    );
  }
  if (armor === "artisan") {
    return (
      <g>
        <path d="M12 100 C16 82 32 73 50 73 C68 73 84 82 88 100 Z" fill={metal} />
        <path d="M12 100 C16 82 32 73 50 73 C68 73 84 82 88 100 Z" fill="none" stroke={INK} strokeWidth="1.6" />
        {/* apron straps + tool belt */}
        <path d="M40 74 L46 100" stroke={INK} strokeWidth="1.5" fill="none" />
        <path d="M60 74 L54 100" stroke={INK} strokeWidth="1.5" fill="none" />
        <path d="M26 88 L74 96" stroke={INK} strokeWidth="1.8" fill="none" />
        <rect x="60" y="88" width="5" height="6" fill={INK_SOFT} />
      </g>
    );
  }
  /* light — studded leather harness */
  return (
    <g>
      <path d="M12 100 C16 81 32 72 50 72 C68 72 84 81 88 100 Z" fill={metal} />
      <path d="M12 100 C16 81 32 72 50 72 C68 72 84 81 88 100 Z" fill="none" stroke={INK} strokeWidth="1.6" />
      <path d="M30 78 L70 92" stroke={INK} strokeWidth="1.6" fill="none" />
      <circle cx="38" cy="81" r="1.1" fill={INK} />
      <circle cx="50" cy="85" r="1.1" fill={INK} />
      <circle cx="62" cy="89" r="1.1" fill={INK} />
      <path d="M18 96 C22 86 28 81 34 79" fill="none" stroke={INK_SOFT} strokeWidth="1" />
    </g>
  );
}

/** Helm, hood or circlet — only drawn for the disciplines that wear one. */
function Headgear({ armor, role }: { armor: string; role: string }) {
  if (armor === "heavy") {
    return (
      <g>
        <path
          d="M29 44 C29 26 71 26 71 44 L71 36 C71 27 62 23 50 23 C38 23 29 27 29 36 Z"
          fill="#7d7568"
          stroke={INK}
          strokeWidth="1.6"
        />
        <path d="M50 25 L50 33" stroke={INK} strokeWidth="1.8" />
        <path d="M31 40 Q50 34 69 40" fill="none" stroke={INK_SOFT} strokeWidth="1.1" />
      </g>
    );
  }
  if (armor === "robe" && role === "arcanist") {
    return (
      <g>
        <path
          d="M26 52 C24 24 76 24 74 52 C70 34 64 27 50 27 C36 27 30 34 26 52 Z"
          fill="#4a4034"
          stroke={INK}
          strokeWidth="1.6"
        />
        <path d="M30 46 Q50 32 70 46" fill="none" stroke={INK_SOFT} strokeWidth="1" />
      </g>
    );
  }
  if (armor === "robe") {
    return <path d="M34 30 Q50 22 66 30" fill="none" stroke={GOLD} strokeWidth="1.6" />;
  }
  if (armor === "light" && (role === "archer" || role === "blade")) {
    return (
      <path
        d="M30 40 C30 26 70 26 70 40 C66 31 60 28 50 28 C40 28 34 31 30 40 Z"
        fill="rgba(36,26,18,0.35)"
        stroke={INK}
        strokeWidth="1.3"
      />
    );
  }
  return null;
}

const ROLE_MARK: Record<string, string> = {
  guardian: "M50 84 l6 4 v6 l-6 5 -6 -5 v-6 Z",
  blade: "M50 80 l3 12 -3 5 -3 -5 Z",
  archer: "M44 82 q6 7 0 14 M44 82 l12 7 -12 7",
  arcanist: "M50 82 l4 7 8 1 -6 6 2 8 -8 -4 -8 4 2 -8 -6 -6 8 -1 Z",
  mender: "M47 82 h6 v5 h5 v6 h-5 v5 h-6 v-5 h-5 v-6 h5 Z",
  chanter: "M46 96 a3 3 0 1 0 6 0 v-14 l6 3",
  artisan: "M44 92 l8 -8 6 6 -8 8 Z",
};

function Face({
  p,
  raceId,
  classId,
}: {
  p: PortraitData;
  raceId?: string | undefined;
  classId?: string | undefined;
}) {
  const uid = useId().replace(/[:]/g, "");
  const cls = classId ? CLASS_BY_ID[classId] : undefined;
  const armor: string = cls?.armor ?? "light";
  const role: string = cls?.role ?? "blade";
  const race = raceId ?? cls?.race;
  const a = anatomyFor(race);

  const skin = SKIN_TONES[p.skin % SKIN_TONES.length]!;
  const hair = HAIR_COLORS[p.hairColor % HAIR_COLORS.length]!;
  const ground = BG_COLORS[p.bg % BG_COLORS.length]!;
  const metal =
    armor === "heavy" ? "#8b8375" : armor === "robe" ? "#59493a" : armor === "artisan" ? "#6b543c" : "#57402c";

  const cx = 50;
  const cy = 44;
  const rx = a.rx;
  const ry = a.ry;
  const jawW = rx * (0.55 + a.jaw * 0.32);
  const hooded = armor === "robe" && role === "arcanist";
  const helmed = armor === "heavy";
  const showHair = !helmed && !hooded;
  const beardStyle = a.alwaysBeard && p.beard % 6 === 0 ? 5 : p.beard % 6;

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" role="presentation">
      <defs>
        <pattern id={`hatch-${uid}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="4" stroke={INK} strokeWidth="1" opacity="0.5" />
        </pattern>
        <pattern id={`hatch2-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)">
          <line x1="0" y1="0" x2="0" y2="3" stroke={INK} strokeWidth="0.8" opacity="0.45" />
        </pattern>
        <radialGradient id={`vig-${uid}`} cx="50%" cy="34%" r="78%">
          <stop offset="0%" stopColor="rgba(255,245,220,0.30)" />
          <stop offset="100%" stopColor="rgba(20,14,8,0.55)" />
        </radialGradient>
        <filter id={`grain-${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" />
        </filter>
        <clipPath id={`head-${uid}`}>
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} />
        </clipPath>
      </defs>

      {/* parchment ground */}
      <rect width="100" height="100" fill={PAPER} />
      <rect width="100" height="100" fill={ground} opacity="0.22" />
      <rect width="100" height="100" fill={`url(#vig-${uid})`} />
      <rect width="100" height="100" filter={`url(#grain-${uid})`} opacity="0.10" />
      {/* engraved backdrop rules */}
      <g stroke={INK} strokeWidth="0.5" opacity="0.10">
        {[16, 24, 32, 40, 48].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y - 10} />
        ))}
      </g>

      {a.wing && (
        <path
          d="M6 96 C4 72 14 56 26 50 C20 62 18 78 22 96 Z"
          fill={INK_SOFT}
          opacity="0.5"
          stroke={INK}
          strokeWidth="0.8"
        />
      )}

      <Harness armor={armor} role={role} metal={metal} />

      {/* neck */}
      <path d={`M${cx - 7} ${cy + ry - 4} h14 v10 h-14 Z`} fill={skin} stroke={INK} strokeWidth="1.2" />
      <path d={`M${cx - 7} ${cy + ry - 2} q7 5 14 0`} fill="url(#none)" stroke={INK_SOFT} strokeWidth="1" opacity="0.6" />

      {/* ears */}
      {a.ears === "long" && (
        <>
          <path d={`M${cx - rx + 1} ${cy - 2} l-9 -14 q7 1 9 8 Z`} fill={skin} stroke={INK} strokeWidth="1.1" />
          <path d={`M${cx + rx - 1} ${cy - 2} l9 -14 q-7 1 -9 8 Z`} fill={skin} stroke={INK} strokeWidth="1.1" />
        </>
      )}
      {a.ears === "swept" && (
        <>
          <path d={`M${cx - rx + 1} ${cy} l-10 -7 q6 -1 10 3 Z`} fill={skin} stroke={INK} strokeWidth="1.1" />
          <path d={`M${cx + rx - 1} ${cy} l10 -7 q-6 -1 -10 3 Z`} fill={skin} stroke={INK} strokeWidth="1.1" />
        </>
      )}
      {a.ears === "plain" && (
        <>
          <ellipse cx={cx - rx} cy={cy + 2} rx="2.6" ry="4" fill={skin} stroke={INK} strokeWidth="1" />
          <ellipse cx={cx + rx} cy={cy + 2} rx="2.6" ry="4" fill={skin} stroke={INK} strokeWidth="1" />
        </>
      )}
      {a.ears === "feathered" && (
        <>
          <path d={`M${cx - rx} ${cy - 2} l-11 -6 l4 6 l-6 2 l9 2 Z`} fill="#cfc3ac" stroke={INK} strokeWidth="0.9" />
          <path d={`M${cx + rx} ${cy - 2} l11 -6 l-4 6 l6 2 l-9 2 Z`} fill="#cfc3ac" stroke={INK} strokeWidth="0.9" />
        </>
      )}

      {/* skull + jaw */}
      <path
        d={`M${cx - rx} ${cy - 4}
            C${cx - rx} ${cy - ry - 2} ${cx + rx} ${cy - ry - 2} ${cx + rx} ${cy - 4}
            C${cx + rx} ${cy + 8} ${cx + jawW} ${cy + ry} ${cx} ${cy + ry}
            C${cx - jawW} ${cy + ry} ${cx - rx} ${cy + 8} ${cx - rx} ${cy - 4} Z`}
        fill={skin}
        stroke={INK}
        strokeWidth="1.6"
      />

      {/* engraved shading inside the head */}
      <g clipPath={`url(#head-${uid})`}>
        <path
          d={`M${cx + rx - 8} ${cy - ry} L${cx + rx} ${cy - ry} L${cx + rx} ${cy + ry} L${cx + 4} ${cy + ry} Z`}
          fill={`url(#hatch-${uid})`}
          opacity="0.6"
        />
        <path
          d={`M${cx - 12} ${cy + 12} q12 9 24 0 l0 ${ry} l-24 0 Z`}
          fill={`url(#hatch2-${uid})`}
          opacity="0.4"
        />
        <path d={`M${cx - 12} ${cy - 8} q12 -6 24 0`} fill="none" stroke={INK_SOFT} strokeWidth="0.8" opacity="0.5" />
      </g>

      {a.brow && (
        <path d={`M${cx - 14} ${cy - 8} q14 -6 28 0 q-14 3 -28 0 Z`} fill={INK_SOFT} opacity="0.55" />
      )}

      {/* hair */}
      {showHair && (
        <g fill={hair} stroke={INK} strokeWidth="1.1">
          {p.hair % 8 === 0 && <path d="M30 40 C30 21 70 21 70 40 C68 29 61 25 50 25 C39 25 32 29 30 40 Z" />}
          {p.hair % 8 === 1 && (
            <>
              <path d="M29 44 C29 19 71 19 71 44 L71 31 C71 23 60 20 50 20 C40 20 29 23 29 31 Z" />
              <path d="M28 40 C23 54 26 64 28 68 L34 44 Z" />
              <path d="M72 40 C77 54 74 64 72 68 L66 44 Z" />
            </>
          )}
          {p.hair % 8 === 2 && <path d="M30 38 C34 19 66 19 70 38 C64 29 58 33 50 29 C42 33 36 29 30 38 Z" />}
          {p.hair % 8 === 3 && (
            <>
              <path d="M30 36 C34 17 66 17 70 36 C62 27 38 27 30 36 Z" />
              <path d="M48 17 C53 8 60 11 57 20 Z" />
            </>
          )}
          {p.hair % 8 === 4 && (
            <>
              <path d="M31 42 C31 21 69 21 69 42 C69 27 31 27 31 42 Z" />
              <path d="M50 19 C59 12 68 17 63 26" fill="none" strokeWidth="5" strokeLinecap="round" stroke={hair} />
            </>
          )}
          {p.hair % 8 === 5 && <path d="M32 34 C38 21 62 21 68 34 C60 29 40 29 32 34 Z" />}
          {p.hair % 8 === 6 && (
            <>
              <path d="M29 46 C29 19 71 19 71 46 L71 33 C71 24 59 21 50 21 C41 21 29 24 29 33 Z" />
              <path d="M26 44 C19 62 21 78 26 86 L34 50 Z" />
              <path d="M74 44 C81 62 79 78 74 86 L66 50 Z" />
            </>
          )}
          {p.hair % 8 === 7 && <path d="M32 29 C40 23 60 23 68 29 C63 26 37 26 32 29 Z" />}
        </g>
      )}

      <Headgear armor={armor} role={role} />

      {/* brows */}
      <g stroke={INK} fill="none" strokeLinecap="round">
        {p.brow % 4 === 0 && (
          <>
            <path d="M37 38 h10" strokeWidth="2.2" />
            <path d="M53 38 h10" strokeWidth="2.2" />
          </>
        )}
        {p.brow % 4 === 1 && (
          <>
            <path d="M37 39 L47 36.6" strokeWidth="2.4" />
            <path d="M63 39 L53 36.6" strokeWidth="2.4" />
          </>
        )}
        {p.brow % 4 === 2 && (
          <>
            <path d="M37 36.6 L47 39" strokeWidth="2.4" />
            <path d="M63 36.6 L53 39" strokeWidth="2.4" />
          </>
        )}
        {p.brow % 4 === 3 && (
          <>
            <path d="M37 38 Q42 34.6 47 38" strokeWidth="2.2" />
            <path d="M63 38 Q58 34.6 53 38" strokeWidth="2.2" />
          </>
        )}
      </g>

      {/* eyes */}
      <g fill={a.darkSclera ? "#2b2430" : "#f6f1e2"} stroke={INK} strokeWidth="1">
        {p.eyes % 5 === 0 && (
          <>
            <ellipse cx="42" cy="45" rx="4.2" ry="2.8" />
            <ellipse cx="58" cy="45" rx="4.2" ry="2.8" />
          </>
        )}
        {p.eyes % 5 === 1 && (
          <>
            <path d="M38 45 h8" strokeWidth="2.6" />
            <path d="M54 45 h8" strokeWidth="2.6" />
          </>
        )}
        {p.eyes % 5 === 2 && (
          <>
            <path d="M38 45 Q42 41 46 45 Q42 47.6 38 45 Z" />
            <path d="M54 45 Q58 41 62 45 Q58 47.6 54 45 Z" />
          </>
        )}
        {p.eyes % 5 === 3 && (
          <>
            <circle cx="42" cy="45" r="3.3" />
            <circle cx="58" cy="45" r="3.3" />
          </>
        )}
        {p.eyes % 5 === 4 && (
          <>
            <path d="M38 46 Q42 41.6 46 44.4 Q42 47 38 46 Z" />
            <path d="M62 46 Q58 41.6 54 44.4 Q58 47 62 46 Z" />
          </>
        )}
      </g>
      <circle cx="42" cy="45" r="1.5" fill={a.darkSclera ? "#e6dcc4" : "#1a1410"} />
      <circle cx="58" cy="45" r="1.5" fill={a.darkSclera ? "#e6dcc4" : "#1a1410"} />

      {/* nose + mouth */}
      <path d="M50 46 L47.6 53.4 L52.4 53.4" fill="none" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M44.5 58.5 Q50 61.4 55.5 58.5" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

      {a.tusks && (
        <>
          <path d="M43.5 60 q-2.2 -5.5 0.4 -8.5" fill="none" stroke="#efe6cf" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M56.5 60 q2.2 -5.5 -0.4 -8.5" fill="none" stroke="#efe6cf" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}

      {/* beard */}
      <g fill={hair} stroke={INK} strokeWidth="1">
        {beardStyle === 1 && <path d="M44 55.6 Q50 57.8 56 55.6 L56 59 Q50 61 44 59 Z" />}
        {beardStyle === 2 && <path d="M34 48 Q36 68 50 70.5 Q64 68 66 48 Q60 62 50 62 Q40 62 34 48 Z" />}
        {beardStyle === 3 && <path d="M42 60 Q50 74 58 60 Q50 66 42 60 Z" />}
        {beardStyle === 4 && (
          <>
            <path d="M44 55.6 Q50 57.8 56 55.6 L56 58.4 Q50 60.4 44 58.4 Z" />
            <path d="M45 62 Q50 68 55 62 Q50 65 45 62 Z" />
          </>
        )}
        {beardStyle === 5 && <path d="M33 46 Q34 76 50 80 Q66 76 67 46 Q62 66 50 66 Q38 66 33 46 Z" />}
      </g>

      {/* markings */}
      {p.mark % 6 === 1 && <path d="M40 35 L44 56" stroke={GOLD} strokeWidth="1.6" />}
      {p.mark % 6 === 2 && (
        <>
          <circle cx="36" cy="50" r="1.4" fill={GOLD} />
          <circle cx="64" cy="50" r="1.4" fill={GOLD} />
        </>
      )}
      {p.mark % 6 === 3 && <path d="M56 37 L62 52" stroke="rgba(178,64,47,0.9)" strokeWidth="1.6" />}
      {p.mark % 6 === 4 && <path d="M42 32 Q50 28 58 32" fill="none" stroke={GOLD} strokeWidth="1.4" />}
      {p.mark % 6 === 5 && (
        <>
          <path d="M38 52 L42 48 L38 44" fill="none" stroke="rgba(120,180,205,0.9)" strokeWidth="1.3" />
          <path d="M62 52 L58 48 L62 44" fill="none" stroke="rgba(120,180,205,0.9)" strokeWidth="1.3" />
        </>
      )}

      {/* collar emblem */}
      {ROLE_MARK[role] && (
        <path d={ROLE_MARK[role]} fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.85" />
      )}
    </svg>
  );
}

export const Portrait = memo(function Portrait({
  data,
  className = "",
  ring,
  raceId,
  classId,
  fallen,
}: {
  data: PortraitData;
  className?: string | undefined;
  /** gold frame for the Lord */
  ring?: boolean | undefined;
  raceId?: string | undefined;
  classId?: string | undefined;
  /** desaturate a fallen champion */
  fallen?: boolean | undefined;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-sm border ${
        ring
          ? "border-gold/80 shadow-[0_0_0_1px_rgba(216,185,105,0.35),inset_0_0_10px_rgba(0,0,0,0.45)]"
          : "border-[#8a7448]/70 shadow-[inset_0_0_8px_rgba(0,0,0,0.4)]"
      } ${fallen ? "grayscale" : ""} ${className}`}
    >
      {data.url ? (
        <img src={data.url} alt="" className="h-full w-full object-cover" />
      ) : (
        <Face p={data} raceId={raceId} classId={classId} />
      )}
      {/* engraved double rule + corner ticks */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-[2px] rounded-[1px] border ${
          ring ? "border-gold/45" : "border-[#8a7448]/35"
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,transparent_45%,rgba(0,0,0,0.35)_100%)]`}
      />
    </div>
  );
});
