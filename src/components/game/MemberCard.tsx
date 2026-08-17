import { PROFESSION_BY_ID } from "@/lib/game/professions";
import {
  ARMOR_LABEL,
  CLASS_BY_ID,
  CRAFT_MASTERY_LABEL,
  GRADE_CLASS,
  ITEM_BY_ID,
  MAX_LEVEL,
  RACE_BY_ID,
  ROLE_LABEL,
  SKILL_BY_ID,
  STAT_LABEL,
  type Stats,
} from "@/lib/game/data";
import {
  armorMastery,
  maxHp,
  maxMp,
  memberPassives,
  memberPower,
  memberStats,
  type GameState,
  type Member,
} from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { DRAG_ITEM, DRAG_MEMBER } from "@/lib/game/dnd";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ItemTooltip } from "./ItemTooltip";
import { ItemIcon } from "./ItemIcon";
import { ClassPicto } from "./Picto";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChampionDialog } from "./ChampionDialog";
import { Portrait } from "./Portrait";

export function ClassTag({ classId }: { classId: string }) {
  const cls = CLASS_BY_ID[classId]!;
  const race = RACE_BY_ID[cls.race]!;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <ClassPicto classId={classId} size="sm" />
      {race.name} · {cls.name} · {ROLE_LABEL[cls.role]} · {ARMOR_LABEL[cls.armor]}
    </span>
  );
}

export function StatBlock({ member }: { member: Member }) {
  const stats = memberStats(member);
  return (
    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
      {(Object.keys(STAT_LABEL) as (keyof Stats)[]).map((k) => (
        <span key={k}>
          {STAT_LABEL[k]} <span className="text-foreground">{stats[k]}</span>
        </span>
      ))}
    </div>
  );
}

export function Vitals({ member }: { member: Member }) {
  const hp = Math.round((member.hp / maxHp(member)) * 100);
  const mp = Math.round((member.mp / maxMp(member)) * 100);
  return (
    <div className="mt-1 space-y-0.5">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-secondary">
          <div className="h-full bg-destructive" style={{ width: `${hp}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">
          HP {Math.round(member.hp)}/{maxHp(member)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${mp}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">
          MP {Math.round(member.mp)}/{maxMp(member)}
        </span>
      </div>
    </div>
  );
}

function Passives({ member }: { member: Member }) {
  const arm = armorMastery(member);
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {memberPassives(member).map((p) => (
        <HoverCard key={p.name} openDelay={120}>
          <HoverCardTrigger asChild>
            <span className="cursor-help rounded-sm border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary">
              {p.name}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-56 border-border bg-card p-3 text-xs">
            <div className="font-display text-sm text-primary">{p.name}</div>
            <p className="mt-1 text-muted-foreground">{p.desc}</p>
          </HoverCardContent>
        </HoverCard>
      ))}
      {arm.worn && arm.mult !== 1 && (
        <span
          className={cn(
            "rounded-sm border px-1.5 py-0.5 text-[10px]",
            arm.mult > 1 ? "border-gold/50 text-gold" : "border-destructive/50 text-destructive",
          )}
        >
          {arm.mult > 1 ? `${ARMOR_LABEL[arm.trained as "robe"]} +15%` : "Untrained armour −15%"}
        </span>
      )}
      {member.craftMastery && (
        <span className="rounded-sm border border-gold/50 px-1.5 py-0.5 text-[10px] text-gold">
          {CRAFT_MASTERY_LABEL[member.craftMastery]}
        </span>
      )}
    </div>
  );
}

export function MemberCard({
  member,
  right,
  compact,
  state,
  api,
}: {
  member: Member;
  right?: React.ReactNode;
  compact?: boolean;
  state?: GameState | undefined;
  api?: ClanApi | undefined;
}) {
  const down = member.hp <= 0;
  const [open, setOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  return (
    <div
      onClick={() => setOpen(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setOpen(true);
      }}
      draggable={!!api}
      onDragStart={(e) => {
        if (!api) return;
        e.dataTransfer.setData(DRAG_MEMBER, member.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!api || !e.dataTransfer.types.includes(DRAG_ITEM)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        setDropping(false);
        if (!api) return;
        const item = e.dataTransfer.getData(DRAG_ITEM);
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        api.equip(member.id, item as never);
      }}
      className={cn(
        "panel cursor-pointer rounded-sm px-3 py-2 transition-colors hover:border-primary/60",
        api && "cursor-grab active:cursor-grabbing",
        compact ? "py-1.5" : "",
        down && "opacity-60 ring-1 ring-destructive/50",
        dropping && "border-gold ring-2 ring-gold/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {member.portrait && (
          <Portrait
            data={member.portrait}
            classId={member.classId}
            fallen={down}
            ring={!!member.isLord}
            className={compact ? "h-8 w-8 shrink-0" : "h-11 w-11 shrink-0"}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate font-display text-sm text-foreground">{member.name}</span>
            {member.isLord && (
              <span className="text-[10px] uppercase tracking-widest text-gold">lord</span>
            )}
            <span className="text-xs text-primary">
              Lv {member.level}
              {member.level >= MAX_LEVEL && !member.paragon ? " (max)" : ""}
              {member.paragon ? (
                <span
                  className="ml-1 text-[#b9a8e6]"
                  title={`Ascendant — Paragon ${member.paragon}`}
                >
                  ✦{member.paragon}
                </span>
              ) : null}
            </span>
            {down && <span className="text-[10px] uppercase text-destructive">fallen</span>}
          </div>
          {member.profession && (
            <div className="text-[10px] uppercase tracking-widest text-primary/80">
              {PROFESSION_BY_ID[member.profession]?.name}
            </div>
          )}
          {member.title && <div className="text-[10px] italic text-gold/80">{member.title}</div>}
          {!compact && member.marks && member.marks.length > 0 && (
            <div
              className="truncate text-[10px] italic text-muted-foreground/90"
              title={member.marks[0]!.text}
            >
              “{member.marks[0]!.text}”
            </div>
          )}
          <ClassTag classId={member.classId} />
          <Vitals member={member} />
          {!compact && (
            <>
              <StatBlock member={member} />
              <Passives member={member} />
              <div className="mt-1 flex flex-wrap gap-1">
                {member.skills.map((s) => (
                  <span
                    key={s.skillId}
                    className="rounded-sm border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {SKILL_BY_ID[s.skillId]?.name} m{s.level}
                  </span>
                ))}
                {member.gear.map((g, i) => (
                  <ItemTooltip key={`${g}-${i}`} item={g}>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[10px]",
                        GRADE_CLASS[ITEM_BY_ID[g]!.grade],
                      )}
                    >
                      <ItemIcon item={g} size={16} className="border-0 bg-transparent" />
                      {ITEM_BY_ID[g]!.name}
                    </span>
                  </ItemTooltip>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="font-display text-sm text-gold">{memberPower(member)}</span>
          {right}
        </div>
      </div>
      <ChampionDialog member={member} open={open} onOpenChange={setOpen} state={state} api={api} />
    </div>
  );
}
