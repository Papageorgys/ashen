import {
  Shield,
  Swords,
  Crosshair,
  Sparkles,
  HeartPulse,
  Music,
  Hammer,
  Flame,
  Snowflake,
  Skull,
  Wind,
  Eye,
  Bell,
  Anvil,
  Sword,
  BookOpen,
  Sun,
  Sprout,
  Feather,
  Waves,
  Leaf,
  Moon,
  VenetianMask,
  Ghost,
  Axe,
  Drum,
  Mountain,
  Pickaxe,
  Gem,
  type LucideIcon,
} from "lucide-react";
import { CLASS_BY_ID, ROLE_LABEL, SKILL_BY_ID, type Role, type SkillKind } from "@/lib/game/data";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<Role, LucideIcon> = {
  guardian: Shield,
  blade: Swords,
  archer: Crosshair,
  arcanist: Sparkles,
  mender: HeartPulse,
  chanter: Music,
  artisan: Hammer,
};

const ROLE_TONE: Record<Role, string> = {
  guardian: "text-sky-300/90 border-sky-400/30 bg-sky-400/10",
  blade: "text-rose-300/90 border-rose-400/30 bg-rose-400/10",
  archer: "text-emerald-300/90 border-emerald-400/30 bg-emerald-400/10",
  arcanist: "text-violet-300/90 border-violet-400/30 bg-violet-400/10",
  mender: "text-amber-200/90 border-amber-300/30 bg-amber-300/10",
  chanter: "text-teal-300/90 border-teal-400/30 bg-teal-400/10",
  artisan: "text-orange-300/90 border-orange-400/30 bg-orange-400/10",
};

/** One distinct sigil per class so no two look alike on the roster. */
const CLASS_ICON: Record<string, LucideIcon> = {
  bulwark: Shield,
  duelist: Swords,
  windshot: Crosshair,
  runecaster: BookOpen,
  lightbearer: Sun,
  verdant: Sprout,
  gladeshot: Feather,
  tideweaver: Waves,
  lifebinder: Leaf,
  duskblade: Moon,
  shadowstalk: VenetianMask,
  voidcaller: Ghost,
  hexbinder: Skull,
  ironmaul: Anvil,
  frenzy: Axe,
  totem: Drum,
  spiritcall: Flame,
  runeguard: Mountain,
  prospector: Pickaxe,
  forgewright: Hammer,
  soulhunter: Sword,
  windrider: Wind,
  sealkeeper: Gem,
};

const KIND_ICON: Record<SkillKind, LucideIcon> = {
  attack: Flame,
  heal: HeartPulse,
  buff: Bell,
  debuff: Skull,
};

/** Extra flavour glyphs so no two skills of a role look identical. */
const SLOT_ICON: LucideIcon[] = [Swords, Wind, Eye, Snowflake, Anvil, Axe, Sword, Sun, Ghost];

const KIND_TONE: Record<SkillKind, string> = {
  attack: "text-rose-300/90 border-rose-400/30 bg-rose-400/10",
  heal: "text-emerald-300/90 border-emerald-400/30 bg-emerald-400/10",
  buff: "text-amber-200/90 border-amber-300/30 bg-amber-300/10",
  debuff: "text-violet-300/90 border-violet-400/30 bg-violet-400/10",
};

const SIZE = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" } as const;
const ICON = { sm: 12, md: 16, lg: 20 } as const;

/** Class picto — role-coloured sigil for a member's class. */
export function ClassPicto({
  classId,
  size = "md",
  className,
}: {
  classId: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const cls = CLASS_BY_ID[classId];
  if (!cls) return null;
  const Icon = CLASS_ICON[cls.id] ?? ROLE_ICON[cls.role];
  return (
    <span
      title={`${cls.name} · ${ROLE_LABEL[cls.role]}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm border",
        SIZE[size],
        ROLE_TONE[cls.role],
        className,
      )}
    >
      <Icon size={ICON[size]} />
    </span>
  );
}

/** Skill picto — kind-coloured glyph for a learned or learnable skill. */
export function SkillPicto({
  skillId,
  size = "sm",
  className,
}: {
  skillId: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const def = SKILL_BY_ID[skillId];
  if (!def) return null;
  const slot = Number(skillId.split("_").pop() ?? 0);
  const Icon = def.kind === "attack" ? (SLOT_ICON[slot] ?? KIND_ICON.attack) : KIND_ICON[def.kind];
  return (
    <span
      title={`${def.name} · ${def.kind}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm border",
        SIZE[size],
        KIND_TONE[def.kind],
        className,
      )}
    >
      <Icon size={ICON[size]} />
    </span>
  );
}
