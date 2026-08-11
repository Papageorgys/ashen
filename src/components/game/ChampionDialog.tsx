import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollLedger } from "./ScrollLedger";
import { MarkLedger } from "./MarkLedger";
import { Switch } from "@/components/ui/switch";
import { ItemIcon } from "./ItemIcon";
import { ItemTooltip } from "./ItemTooltip";
import { Input } from "@/components/ui/input";
import { Portrait } from "./Portrait";
import { PortraitEditor } from "./PortraitEditor";
import { portraitFromSeed } from "@/lib/game/identity";
import { ClassPicto, SkillPicto } from "./Picto";
import { PROFESSION_BY_ID } from "@/lib/game/professions";
import {
  ARMOR_LABEL,
  CLASS_BY_ID,
  CONDITION_LABEL,
  classSkills,
  CRAFT_MASTERY_LABEL,
  GRADE_CLASS,
  ITEM_BY_ID,
  MAX_LEVEL,
  MAX_SKILL_LEVEL,
  RACE_BY_ID,
  ROLE_LABEL,
  SLOT_LABEL,
  STAT_LABEL,
  splitItemId,
  shotId,
  type Slot,
  type Stats,
} from "@/lib/game/data";
import {
  armorMastery,
  knownSkills,
  maxHp,
  maxMp,
  memberFind,
  memberShotKind,
  memberShotTier,
  memberPassives,
  memberPower,
  memberStats,
  mitigation,
  wornSets,
  skillCost,
  xpForLevel,
  xpForSkillLevel,
  type Member,
} from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

const SLOTS: Slot[] = ["weapon", "armor", "gloves", "boots", "helmet", "jewelry"];

function Vitals({ member }: { member: Member }) {
  const hp = Math.round((member.hp / maxHp(member)) * 100);
  const mp = Math.round((member.mp / maxMp(member)) * 100);
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-28 overflow-hidden rounded-sm bg-secondary">
          <div className="h-full bg-destructive" style={{ width: `${hp}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">
          HP {Math.round(member.hp)}/{maxHp(member)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-28 overflow-hidden rounded-sm bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${mp}%` }} />
        </div>
        <span className="text-[10px] text-muted-foreground">
          MP {Math.round(member.mp)}/{maxMp(member)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1 text-xs last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-display text-sm", tone)}>{value}</span>
    </div>
  );
}

export function ChampionDialog({
  member,
  open,
  onOpenChange,
  state,
  api,
}: {
  member: Member | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state?: GameState | undefined;
  api?: ClanApi | undefined;
}) {
  if (!member) return null;
  const cls = CLASS_BY_ID[member.classId]!;
  const race = RACE_BY_ID[cls.race]!;
  const prof = member.profession ? PROFESSION_BY_ID[member.profession] : undefined;
  const stats = memberStats(member);
  const arm = armorMastery(member);
  const known = knownSkills(member);
  const upcoming = classSkills(member.classId)
    .filter((s) => !member.skills.some((k) => k.skillId === s.id))
    .sort((a, b) => a.unlock - b.unlock);


  const worn = new Map<Slot, string>();
  for (const g of member.gear) {
    const it = ITEM_BY_ID[g];
    if (it?.slot) worn.set(it.slot, g);
  }
  const pvp = member.pvpKills ?? 0;
  const pk = member.pkKills ?? 0;
  const karma = pk * 240;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-2xl overflow-y-auto border-border bg-card"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {member.portrait ? (
              <Portrait data={member.portrait} classId={member.classId} ring={!!member.isLord} className="h-14 w-14 shrink-0" />
            ) : (
              <ClassPicto classId={member.classId} size="lg" />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="font-display text-xl">
                {member.name}
                {member.isLord && (
                  <span className="ml-2 text-[10px] uppercase tracking-widest text-gold">lord</span>
                )}
                <span className="ml-2 text-sm text-primary">
                  Lv {member.level}
                  {member.level >= MAX_LEVEL ? " (max)" : ""}
                </span>
              </DialogTitle>
              {member.title && (
                <div className="text-xs italic text-gold/80">{member.title}</div>
              )}
              <DialogDescription className="text-xs">
                {race.name} · {cls.name} · {ROLE_LABEL[cls.role]} · {ARMOR_LABEL[cls.armor]} mastery
                {member.craftMastery ? ` · ${CRAFT_MASTERY_LABEL[member.craftMastery]}` : ""}
                {prof ? ` · ${prof.name}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-border bg-secondary/40 px-3 py-2">
          <Vitals member={member} />
          <div className="text-right">
            <div className="font-display text-lg text-gold">{memberPower(member)}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              combat power
            </div>
          </div>
        </div>

        <Tabs defaultValue="stats">
          <TabsList>
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="record">Record</TabsTrigger>
            <TabsTrigger value="gear">Equipment</TabsTrigger>
            <TabsTrigger value="face">Portrait</TabsTrigger>
          </TabsList>

          <TabsContent value="face" className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Name
              </span>
              <Input
                defaultValue={member.name}
                maxLength={28}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== member.name) api?.renameMember(member.id, v);
                }}
              />
            </label>
            <PortraitEditor
              portrait={member.portrait ?? portraitFromSeed(member.id + member.name)}
              classId={member.classId}
              onChange={(p) => api?.setPortrait(member.id, p)}
            />
          </TabsContent>

          <TabsContent value="stats" className="mt-3 space-y-3">
            {prof && (
              <div className="panel rounded-sm px-3 py-2">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-sm text-gold">{prof.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    background
                  </span>
                </div>
                <p className="mt-1 text-xs italic text-muted-foreground">{prof.blurb}</p>
                <p className="mt-1 text-xs">
                  <span className="text-primary">{prof.perkName}:</span> {prof.perkText}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="text-foreground">Deed:</span> {prof.deedText} — earns the clan
                  Inspiration.
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(STAT_LABEL) as (keyof Stats)[]).map((k) => (
                <div key={k} className="rounded-sm border border-border px-2 py-1.5 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {STAT_LABEL[k]}
                  </div>
                  <div className="font-display text-lg">{stats[k]}</div>
                </div>
              ))}
            </div>
            <div className="panel rounded-sm px-3 py-2">
              <Row label="Max HP" value={maxHp(member)} tone="text-destructive" />
              <Row label="Max MP" value={maxMp(member)} tone="text-primary" />
              <Row label="Damage mitigation" value={`${Math.round(mitigation(member) * 100)}%`} />
              <Row label="Spoil / find" value={memberFind(member)} tone="text-gold" />
              <Row
                label="Armour mastery"
                value={
                  arm.worn
                    ? `${ARMOR_LABEL[arm.worn as "robe"]} (${arm.mult > 1 ? "+15%" : arm.mult < 1 ? "−15%" : "—"})`
                    : "unarmoured"
                }
              />
              <Row
                label="Experience"
                value={
                  member.level >= MAX_LEVEL
                    ? "capped"
                    : `${member.xp} / ${xpForLevel(member.level)}`
                }
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {memberPassives(member).map((p) => (
                <span
                  key={p.name}
                  className="rounded-sm border border-primary/40 px-1.5 py-0.5 text-[10px] text-primary"
                  title={p.desc}
                >
                  {p.name} — {p.desc}
                </span>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="skills" className="mt-3 space-y-4">
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Active skills
              </h4>
              {known.length === 0 && (
                <p className="text-xs text-muted-foreground">No skills learned yet.</p>
              )}
            {known.map(({ state: s, def }) => (
              <div key={s.skillId} className="panel rounded-sm px-3 py-2">
                <div className="flex items-center gap-2">
                  <SkillPicto skillId={def.id} />
                  <span className="font-display text-sm">{def.name}</span>
                  <span className="text-xs text-gold">
                    mastery {s.level}/{MAX_SKILL_LEVEL}
                  </span>
                  <span className="ml-auto text-[10px] uppercase text-muted-foreground">
                    {CONDITION_LABEL[s.condition]}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {def.desc} · {def.mp} MP · cd {def.cooldown}
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-secondary">
                  <div
                    className="h-full bg-gold"
                    style={{
                      width: `${Math.min(100, (s.xp / xpForSkillLevel(s.level)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Passive traits
              </h4>
              {memberPassives(member).length === 0 && (
                <p className="text-xs text-muted-foreground">No passives.</p>
              )}
              {memberPassives(member).map((p) => (
                <div key={p.name} className="panel rounded-sm px-3 py-2">
                  <div className="font-display text-sm text-primary">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.desc}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Awaiting training
                </h4>
                {api && upcoming.some((d) => d.unlock <= member.level) && (
                  <Button size="sm" variant="outline" onClick={() => api.learnAllSkills(member.id)}>
                    Learn all ready ·{" "}
                    {upcoming
                      .filter((d) => d.unlock <= member.level)
                      .reduce((s, d) => s + skillCost(d), 0)}
                    g
                  </Button>
                )}
              </div>
              {upcoming.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Every skill of this discipline is already learned.
                </p>
              )}
              {upcoming.map((def) => {
                const ready = def.unlock <= member.level;
                return (
                  <div
                    key={def.id}
                    className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 opacity-80"
                  >
                    <SkillPicto skillId={def.id} />
                    <div className="min-w-0">
                      <div className="font-display text-sm">{def.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {def.desc} · {def.mp} MP · cd {def.cooldown}
                      </div>
                    </div>
                    {ready && api ? (
                      <Button
                        size="sm"
                        className="ml-auto shrink-0"
                        onClick={() => api.learnSkill(member.id, def.id)}
                      >
                        Learn · {skillCost(def)}g
                      </Button>
                    ) : (
                      <span
                        className={cn(
                          "ml-auto shrink-0 text-[10px] uppercase tracking-widest",
                          ready ? "text-gold" : "text-muted-foreground",
                        )}
                      >
                        {ready ? "ready to learn" : `Lv ${def.unlock}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

          </TabsContent>


          <TabsContent value="record" className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="panel rounded-sm px-2 py-3 text-center">
                <div className="font-display text-2xl text-primary">{pvp}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  PvP kills
                </div>
              </div>
              <div className="panel rounded-sm px-2 py-3 text-center">
                <div className="font-display text-2xl text-destructive">{pk}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  PK kills
                </div>
              </div>
              <div className="panel rounded-sm px-2 py-3 text-center">
                <div className="font-display text-2xl text-gold">{member.mobKills ?? 0}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Monsters slain
                </div>
              </div>
              <div className="panel rounded-sm px-2 py-3 text-center">
                <div className="font-display text-2xl">{member.deaths ?? 0}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Deaths
                </div>
              </div>
            </div>
            <div className="panel rounded-sm px-3 py-2">
              <Row
                label="Karma"
                value={karma}
                tone={karma > 0 ? "text-destructive" : "text-muted-foreground"}
              />
              <Row
                label="Reputation"
                value={pk > 0 ? "Outlaw" : pvp > 12 ? "Champion" : pvp > 0 ? "Blooded" : "Untested"}
              />
            </div>
            <div className="panel space-y-2 rounded-sm px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Scars &amp; Deeds — what the world has written on {member.name}
              </div>
              <MarkLedger marks={member.marks} limit={20} />
            </div>
            <div className="panel space-y-2 rounded-sm px-3 py-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Scroll ledger — every imprint and field reading, with the check that decided it
              </div>
              {state ? <ScrollLedger state={state} memberId={member.id} limit={12} /> : null}
            </div>
          </TabsContent>

          <TabsContent value="gear" className="mt-3 space-y-2">
            {api && (
              <div className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-secondary/40 px-3 py-2">
                <ItemIcon
                  item={shotId(memberShotKind(member), memberShotTier(member))}
                  size={32}
                />
                <div className="min-w-0">
                  <div className="font-display text-sm">
                    {memberShotKind(member) === "soul" ? "Soulshots" : "Spiritshots"} —{" "}
                    {memberShotTier(member)} grade
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {member.shotsOn === false
                      ? "Holstered — this champion fights bare."
                      : "Loaded from the clan warehouse on every strike."}
                  </div>
                </div>
                <Switch
                  className="ml-auto"
                  checked={member.shotsOn !== false}
                  onCheckedChange={() => api.toggleMemberShots(member.id)}
                />
              </div>
            )}

            {wornSets(member).length > 0 && (
              <div className="rounded-sm border border-border px-3 py-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Armour sets
                </div>
                {wornSets(member).map(({ set, worn, complete }) => (
                  <div key={set.id} className="mt-1 text-xs">
                    <span className={complete ? "text-gold" : "text-muted-foreground"}>
                      {set.name} {worn}/{set.pieces.length}
                    </span>
                    <span className="ml-2 text-[10px] text-muted-foreground">
                      {complete ? set.bonus.desc : "Complete the set to wake its bonus."}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {SLOTS.map((slot) => {
              const g = worn.get(slot);
              const idx = g ? member.gear.indexOf(g) : -1;
              const it = g ? ITEM_BY_ID[g] : undefined;
              const stock = state
                ? Object.entries(state.inventory)
                    .filter(([id, qty]) => (qty ?? 0) > 0 && ITEM_BY_ID[id]?.slot === slot)
                    .map(([id]) => ITEM_BY_ID[id]!)
                : [];
              return (
                <div
                  key={slot}
                  className="flex flex-wrap items-center gap-3 rounded-sm border border-border px-3 py-2"
                >
                  <span className="w-16 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {SLOT_LABEL[slot]}
                  </span>
                  {it ? (
                    <ItemTooltip item={it.id}>
                      <span className="flex min-w-0 items-center gap-2">
                        <ItemIcon item={it.id} size={32} />
                        <span className="min-w-0">
                          <span className={cn("block font-display text-sm", GRADE_CLASS[it.grade])}>
                            {it.name}
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {it.grade} grade · +{it.power ?? 0} power
                            {splitItemId(it.id).quality > 0
                              ? ` · quality ${splitItemId(it.id).quality}`
                              : ""}
                            {it.armorType ? ` · ${ARMOR_LABEL[it.armorType]}` : ""}
                          </span>
                        </span>
                      </span>
                    </ItemTooltip>
                  ) : (
                    <span className="text-xs text-muted-foreground">— empty —</span>
                  )}

                  {api && (
                    <div className="ml-auto flex items-center gap-1">
                      <Select
                        value=""
                        onValueChange={(v) => {
                          if (idx >= 0) api.unequip(member.id, idx);
                          api.equip(member.id, v as never);
                        }}
                        disabled={stock.length === 0}
                      >
                        <SelectTrigger className="h-8 w-44 text-xs">
                          <SelectValue placeholder={stock.length ? "Equip from vault" : "None in vault"} />
                        </SelectTrigger>
                        <SelectContent>
                          {stock.map((o) => (
                            <SelectItem key={o.id} value={o.id} disabled={member.level < (o.reqLevel ?? 1)}>
                              {o.name} · {o.grade} · +{o.power ?? 0}
                              {member.level < (o.reqLevel ?? 1) ? ` (Lv ${o.reqLevel})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {idx >= 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => api.unequip(member.id, idx)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
