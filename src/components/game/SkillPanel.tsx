import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Vitals } from "./MemberCard";
import { ClassPicto, SkillPicto } from "./Picto";
import { CLASS_BY_ID, CONDITION_LABEL, MAX_SKILL_LEVEL, ROLE_LABEL, type SkillCondition } from "@/lib/game/data";
import { knownSkills, learnableSkills, skillCost, xpForSkillLevel, type GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

const CONDITIONS: SkillCondition[] = [
  "always",
  "opening",
  "self_hp_low",
  "ally_hp_low",
  "enemy_hp_low",
  "mp_high",
  "never",
];

export function SkillPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const [sel, setSel] = useState(state.members[0]?.id ?? "");
  const member = state.members.find((m) => m.id === sel) ?? state.members[0];
  if (!member) return null;
  const cls = CLASS_BY_ID[member.classId]!;
  const known = knownSkills(member);
  const learnable = learnableSkills(member);

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg">Skill Tactics</h2>
          <p className="text-xs text-muted-foreground">
            Skills fire top to bottom — the first whose condition is met and whose MP is affordable
            is cast. Every cast earns mastery (max {MAX_SKILL_LEVEL}).
          </p>
        </div>
        <Select value={member.id} onValueChange={setSel}>
          <SelectTrigger className="h-8 w-56 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {state.members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name} · Lv {m.level} {CLASS_BY_ID[m.classId]!.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="panel rounded-sm p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClassPicto classId={member.classId} size="lg" />
            <div>
            <div className="font-display text-sm">{member.name}</div>
            <div className="text-xs text-muted-foreground">
              {cls.name} · {ROLE_LABEL[cls.role]}
            </div>
            </div>
          </div>
          <Vitals member={member} />
        </div>
      </div>

      <div className="space-y-2">
        {known.map(({ state: s, def }, i) => {
          const need = xpForSkillLevel(s.level);
          return (
            <div key={s.skillId} className="panel rounded-sm px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <SkillPicto skillId={def.id} />
                    <span className="font-display text-sm">{def.name}</span>
                    <span className="text-xs text-gold">mastery {s.level}</span>
                    <span className="text-[10px] uppercase text-muted-foreground">{def.kind}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {def.desc} · {def.mp} MP · cd {def.cooldown} · {s.xp}/{need} mastery xp
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Select
                    value={s.condition}
                    onValueChange={(v) => api.setSkillCondition(member.id, s.skillId, v as SkillCondition)}
                  >
                    <SelectTrigger className="h-7 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {CONDITION_LABEL[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => api.moveSkill(member.id, s.skillId, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === known.length - 1}
                    onClick={() => api.moveSkill(member.id, s.skillId, 1)}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {known.length === 0 && (
          <p className="text-sm text-muted-foreground">No skills learned yet.</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm text-muted-foreground">Trainer</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={learnable.length === 0}
              onClick={() => api.learnAllSkills(member.id)}
            >
              Learn all ·{" "}
              {learnable.reduce((s, d) => s + skillCost(d), 0)}g
            </Button>
            <Button size="sm" variant="ghost" onClick={() => api.learnAllSkills()}>
              Train whole clan
            </Button>
          </div>
        </div>
        <div className="mt-2 grid gap-2">
          {learnable.map((def) => (
            <div key={def.id} className="panel flex items-center justify-between rounded-sm px-3 py-2">
              <div className="flex items-center gap-2">
                <SkillPicto skillId={def.id} />
                <div>
                <span className="text-sm">{def.name}</span>
                <div className="text-xs text-muted-foreground">
                  {def.desc} · {def.mp} MP · unlocks Lv {def.unlock}
                </div>
                </div>
              </div>
              <Button size="sm" onClick={() => api.learnSkill(member.id, def.id)}>
                Learn · {skillCost(def)}g
              </Button>
            </div>
          ))}
          {learnable.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nothing new to teach at this level.
            </p>
          )}
        </div>
      </div>

    </section>
  );
}
