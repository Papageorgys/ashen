import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/hooks/useSession";
import { fetchCloudSave, pushCloudSave } from "@/lib/cloud/sync";
import {
  CASTLE,
  RIVAL_BY_ID,
  garrisonPower,
  initialCastle,
  initialRivals,
  resolveClash,
} from "@/lib/game/rivals";
import { DEFAULT_CREST, portraitFromSeed, type Crest, type Portrait } from "@/lib/game/identity";
import { professionFromSeed } from "@/lib/game/professions";
import {
  courtEffects,
  initialCourt,
  fillCharges,
  chargeProgress,
  courtRankIndex,
  courtStanding,
  COURT_RANKS,
  CROWN_RANK,
  BOONS,
  canPetition,
  charterSupply,
  musterLaborers,
  type BoonId,
} from "@/lib/game/court";
import type { TacReward } from "@/lib/game/tactics";
import type { FrontierState } from "@/lib/game/frontier";
import { traitField, TRAITS, traitsFor, type TraitId } from "@/lib/game/traits";
import {
  advanceDomain,
  initialDomain,
  freeWorkers,
  shipmentValue,
  NODE_DEF,
  HIRE_COST,
  CARAVAN_MS,
  WORKER_CAP_PER_NODE,
  NODE_UPGRADE_MAX,
  SUPPLY_VALUE,
  RAW_LABEL,
  type DomainState,
  type NodeType,
  type Workshop,
  type SmithyFocus,
  type Good,
} from "@/lib/game/logistics";
import {
  timeOfDay,
  atmosphere,
  champChatter,
  fieldLetter,
  realmRumor,
  realmEvent,
  courtSeason,
  marketIndex,
  travelingMerchant,
} from "@/lib/game/living";
import {
  CLAN_LEVELS,
  CLASS_BY_ID,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MAX_SKILL_LEVEL,
  RECIPES,
  SKILL_BY_ID,
  ZONES,
  ITEM_BY_ID,
  ZONE_BY_ID,
  DAILY_BY_ID,
  CADENCE_LABEL,
  CRAFT_MASTERY_LABEL,
  emberId,
  shotId,
  type CraftMastery,
  type Grade,
  type ItemId,
  type ShotKind,
  type SkillCondition,
  MAX_QUALITY,
  qualityItemId,
  qualityLabel,
  splitItemId,
} from "@/lib/game/data";
import {
  canCraft,
  canSystemForge,
  systemForgeFee,
  recipeById,
  systemForgeChance,
  canRefine,
  shotBatchCost,
  clanCapacity,
  musterPulse,
  rollProspects,
  prospectCost,
  canAcceptCompany,
  companyPower,
  keepEffects,
  keepLevel,
  keepUpgradeCost,
  canUpgradeKeep,
  mendBill,
  bannersInCity,
  flameRestBill,
  FLAME_REST_FRACTION,
  forgeFee,
  KEEP_BY_ID,
  type KeepBuildingId,
  craftChance,
  qualityStepChance,
  rollQuality,
  canSharpen,
  sharpenCost,
  sharpenChance,
  sharpenWardCost,
  SHARPEN_SAFE,
  canSocketRune,
  RUNE_ITEM,
  memberDamageType,
  DAMAGE_LABEL,
  type RuneType,
  initialState,
  learnSkill as learnSkillFn,
  learnableSkills as learnableSkillsFn,
  skillCost as skillCostFn,
  maxHp,
  memberStats,
  maxMp,
  maxParties,
  canJoinClan,
  JOIN_REQ,
  nextClanReq,
  regenRate,
  suggestFill,
  slotOf,
  resolveRun,
  addMark,
  BOND_AT,
  RIVAL_AT,
  bumpAffinity,
  getAffinity,
  dropAffinity,
  bondsOf,
  partyPower,
  longNightActive,
  supplyCap,
  realmLevy,
  spoilRarity,
  chronicle,
  deathRisk,
  earnedTitle,
  ledPersonally,
  lordOf,
  realmPulse,
  clanHostPower,
  siegeReady,
  LORD_BONUS,
  type Founding,
  dayKey,
  weekKey,
  monthKey,
  rollWeeklies,
  rollMonthlies,
  rollDailies,
  rollRecruits,
  recruitCost,
  rallyReward,
  deedsFromState,
  renownScore,
  earnedTitles,
  CLAN_TITLE_BY_ID,
  inscribeCost,
  ASH_DEBT,
  isSearing,
  longNightTide,
  restAtFlameCost,
  refineAshValue,
  LEDGER,
  loanCeiling,
  insurePremium,
  insured,
  insurePayout,
  bountyOn,
  VASSAL_BY_ID,
  VASSAL,
  reaffirmCost,
  uid,
  xpForLevel,
  xpForSkillLevel,
  canImprint,
  scribeOdds,
  type GameState,
  type Member,
  type Stance,
} from "@/lib/game/engine";
import { SCROLL_BY_ID, travelMsTo } from "@/lib/game/data";
import { MONSTER_BY_ID } from "@/lib/game/monsters";
import {
  bossSpoils,
  bossForDay,
  rollBossLoot,
  blessingCost,
  COMMIT_DEATH_RISK,
} from "@/lib/game/worldboss";

import { IMPROVED_YIELD, SCROLL_LOG_CAP, attemptId, rollOutcomeDetail } from "@/lib/game/scrolls";

const KEY = "clanleader.save.v3";

/** the body remembers — wounds that leave a champion marked */
const WOUND_PARTS = ["left arm", "shoulder", "knee", "ribs", "sword hand", "jaw", "hip"] as const;

function load(): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}

/** bring an older or remote save up to the current shape */
function patch(loaded: GameState): GameState {
  const today = dayKey();
  const week = weekKey();
  const month = monthKey();
  if (!loaded.daily || loaded.daily.day !== today) loaded.daily = rollDailies(today);
  if (!loaded.weekly || loaded.weekly.day !== week) loaded.weekly = rollWeeklies(week);
  if (!loaded.monthly || loaded.monthly.day !== month) loaded.monthly = rollMonthlies(month);
  // older saves predate heraldry, the realm and the Lord — fill them in
  loaded.crest = loaded.crest ?? DEFAULT_CREST;
  loaded.motto = loaded.motto ?? "We rise from ash.";
  loaded.chronicle = loaded.chronicle ?? [];
  loaded.memorial = loaded.memorial ?? [];
  loaded.rivals = loaded.rivals?.length ? loaded.rivals : initialRivals();
  loaded.castle = loaded.castle ?? initialCastle();
  if (!loaded.members.some((m) => m.isLord) && loaded.members[0]) loaded.members[0].isLord = true;
  for (const m of loaded.members) m.portrait = m.portrait ?? portraitFromSeed(m.id + m.name);
  for (const r of loaded.recruits) r.portrait = r.portrait ?? portraitFromSeed(r.id + r.name);
  // backgrounds arrived later — give everyone the one their story implies
  for (const m of [...loaded.members, ...loaded.recruits])
    m.profession = m.profession ?? professionFromSeed(m.id + m.name);
  // the marks ledger post-dates older saves — start everyone with a clean slate
  for (const m of [...loaded.members, ...loaded.recruits]) m.marks = m.marks ?? [];
  // bonds between champions arrived later too
  loaded.affinity = loaded.affinity ?? {};
  loaded.inspiration = loaded.inspiration ?? 0;
  // per-banner boss-charge cooldowns post-date older saves
  loaded.bossCommitAt = loaded.bossCommitAt ?? {};
  // the feudal court arrived later — swear every existing house to the crown, and
  // keep its charge board topped up so the King always has work waiting
  loaded.court = loaded.court ?? initialCourt();
  loaded.court.stats = loaded.court.stats ?? { kills: 0, runs: 0, bossKills: 0 };
  loaded.court.charges = loaded.court.charges ?? [];
  // pre-split saves kept rank in the favor purse; seed standing from it so no one
  // is demoted, then favor becomes freely spendable from here on
  loaded.court.standing = loaded.court.standing ?? loaded.court.favor;
  fillCharges(loaded.court, loaded);
  // the war-logistics domain post-dates older saves
  loaded.domain = loaded.domain ?? initialDomain(Date.now());
  loaded.discovered = loaded.discovered ?? [];
  // banners now hold five — trim any legacy nine-strong party
  for (const p of loaded.parties) {
    if (p.memberIds.length > MAX_PARTY_SIZE) {
      for (const id of p.memberIds.slice(MAX_PARTY_SIZE)) {
        const m = loaded.members.find((x) => x.id === id);
        if (m) m.partyId = null;
      }
      p.memberIds = p.memberIds.slice(0, MAX_PARTY_SIZE);
    }
  }
  return loaded;
}

export function useClanGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;
  const { user, ready: authReady } = useSession();
  const [cloudReady, setCloudReady] = useState(false);

  useEffect(() => {
    const loaded = load();
    setState(loaded ? patch(loaded) : null);
    setHydrated(true);
  }, []);

  /**
   * On sign-in, reconcile this device's save with the cloud:
   * - the cloud wins only when it is actually newer, or when the local save belongs to
   *   a different user (never blindly overwrite a fresher local save);
   * - otherwise the local save is claimed for this user and uploaded;
   * - a local save owned by someone else, with no cloud save for this user, is never
   *   uploaded — that would leak the previous player's clan into a new account.
   */
  useEffect(() => {
    if (!hydrated || !authReady) return;
    if (!user) {
      setCloudReady(false);
      return;
    }
    let live = true;
    setCloudReady(false);
    (async () => {
      const remote = await fetchCloudSave(user.id);
      if (!live) return;
      const local = stateRef.current;
      const localOwnedByUser = !!local && (local.ownerId == null || local.ownerId === user.id);
      if (remote && (!localOwnedByUser || (remote.savedAt ?? 0) >= (local?.savedAt ?? 0))) {
        setState(patch({ ...remote, ownerId: user.id }));
      } else if (localOwnedByUser && local) {
        const claimed = patch({ ...local, ownerId: user.id, savedAt: Date.now() });
        setState(claimed);
        await pushCloudSave(user.id, claimed);
      } else {
        // local save belongs to another account and the cloud is empty: don't leak it
        setState(null);
      }
      if (live) setCloudReady(true);
    })();
    return () => {
      live = false;
    };
  }, [hydrated, authReady, user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    if (state) {
      // stamp recency on every write so sign-in can arbitrate local vs cloud
      state.savedAt = Date.now();
      window.localStorage.setItem(KEY, JSON.stringify(state));
    }
  }, [state, hydrated]);

  /**
   * Steady push of the world state and ladder standing. A fixed interval that reads the
   * latest state from the ref cannot be starved the way a debounce cleared on every state
   * change could — that starvation previously meant actively-playing users never saved to
   * the cloud (state changes as often as every 1.5s). Also flushes once on teardown/sign-out.
   */
  useEffect(() => {
    if (!cloudReady || !user) return;
    const userId = user.id;
    const flush = () => {
      const s = stateRef.current;
      if (s && (s.ownerId == null || s.ownerId === userId)) void pushCloudSave(userId, s);
    };
    const t = setInterval(flush, 10000);
    return () => {
      clearInterval(t);
      flush();
    };
  }, [cloudReady, user?.id]);

  const pushLog = (s: GameState, text: string, tone: "good" | "bad" | "info") => {
    s.log = [{ id: uid(), at: Date.now(), text, tone }, ...s.log].slice(0, 60);
  };

  /** Grant royal favor and handle any court rank-ups (or coronation) it triggers.
   * The current court season scales what favor is worth this week. */
  const awardFavor = (s: GameState, amount: number) => {
    if (!s.court || amount <= 0) return;
    const weekIdx = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const scaled = Math.round(amount * courtSeason(weekIdx).favorMult);
    // standing (cumulative) drives rank; favor (the purse) is what gets spent —
    // earning grows both, so a royal boon never costs you your title
    s.court.standing = (s.court.standing ?? s.court.favor) + scaled;
    const before = courtRankIndex(s.court.standing - scaled);
    s.court.favor += scaled;
    const after = courtRankIndex(s.court.standing);
    for (let r = before + 1; r <= after; r++) {
      const rank = COURT_RANKS[r]!;
      if (r >= CROWN_RANK) {
        s.court.crowned = true;
        pushLog(
          s,
          `The Ashen Throne is yours. You are crowned ${rank.title} — ${rank.holding}.`,
          "good",
        );
        toast.success("You take the crown.", { description: "Sovereign of the Crownlands." });
        chronicle(
          s,
          "rise",
          "The Crown Taken",
          `Crowned ${rank.title} — the Crownlands answer to your house.`,
        );
      } else {
        pushLog(s, `The King raises you to ${rank.title} — ${rank.holding}.`, "good");
        toast.success(`Raised at court: ${rank.title}.`, { description: rank.grant });
      }
    }
    if (after > before) s.court.seenRank = after;
  };

  const update = useCallback((fn: (draft: GameState) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const draft: GameState = JSON.parse(JSON.stringify(prev));
      fn(draft);
      return draft;
    });
  }, []);

  /** expedition tick */
  useEffect(() => {
    const t = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      const now = Date.now();
      if (
        !cur.parties.some(
          (p) => (p.run && p.run.endsAt <= now) || (p.travel && p.travel.arrivesAt <= now),
        )
      )
        return;
      update((s) => {
        for (const party of s.parties) {
          // A marching banner that has reached its zone sets to the hunt (no loot yet).
          if (party.travel) {
            if (party.travel.arrivesAt > now) continue;
            const tz = ZONE_BY_ID[party.travel.zoneId];
            party.run = tz ? { zoneId: party.travel.zoneId, endsAt: now + tz.durationMs } : null;
            party.travel = null;
            if (tz) pushLog(s, `${party.name} reached ${tz.name} and set to the hunt.`, "info");
            continue;
          }
          if (!party.run || party.run.endsAt > now) continue;
          const zoneId = party.run.zoneId;
          const res = resolveRun(s, party, zoneId);
          party.run = null;
          const lordLed = ledPersonally(s, party);
          // The Long Night runs thick with Ash: braving it pays richer (§5).
          const tide = longNightTide(s, now);
          // standing at the King's court pays a pension on every hunt (§ Court)
          const court = courtEffects(s);
          // champions' traits follow them into the field (Berserker/Executioner
          // pull richer spoils, and so on) — § traits.ts
          const traitGold = res.participants.reduce(
            (n, id) => n + (traitField(s.members.find((x) => x.id === id)?.trait).gold ?? 0),
            0,
          );
          s.gold += Math.round(
            res.gold *
              (lordLed ? 1 + LORD_BONUS.gold : 1) *
              tide.spoilMult *
              court.goldMult *
              (1 + traitGold),
          );
          if (tide.ashTide > 0) s.rawAsh = (s.rawAsh ?? 0) + tide.ashTide;
          s.reputation += Math.round(
            res.rep * keepEffects(s).repMult * (lordLed ? 1.1 : 1) * court.repMult,
          );
          // the crown's charges read these durable tallies for their progress
          if (s.court) {
            s.court.stats.runs += 1;
            s.court.stats.kills += res.kills;
          }
          const zoneName = ZONE_BY_ID[zoneId]?.name ?? "the field";
          const spoils = res.loot.map((l) => ({
            id: uid(),
            at: Date.now(),
            item: l.item,
            qty: l.qty,
            rarity: spoilRarity(l.item),
            zone: zoneName,
            party: party.name,
          }));
          for (const l of res.loot) {
            s.inventory[l.item] = (s.inventory[l.item] ?? 0) + l.qty;
          }
          if (spoils.length) s.spoils = [...spoils, ...(s.spoils ?? [])].slice(0, 40);
          for (const sp of spoils) {
            if (sp.rarity === "epic") {
              toast.success(`${ITEM_BY_ID[sp.item]?.name ?? sp.item} x${sp.qty}`, {
                description: `A find of legend out of ${sp.zone}.`,
              });
            } else if (sp.rarity === "rare") {
              toast(`${ITEM_BY_ID[sp.item]?.name ?? sp.item} x${sp.qty}`, {
                description: `Rare drop — ${sp.zone}.`,
              });
            }
          }
          // bestiary — everything the banner met out there
          if (res.encounters?.length) {
            s.bestiary ??= {};
            for (const e of res.encounters) {
              const entry = s.bestiary[e.monsterId];
              if (entry) {
                entry.kills += e.kills;
                entry.elites += e.elite ? e.kills : 0;
                entry.lastAt = now;
              } else {
                s.bestiary[e.monsterId] = {
                  kills: e.kills,
                  elites: e.elite ? e.kills : 0,
                  firstAt: now,
                  lastAt: now,
                };
                const beast = MONSTER_BY_ID[e.monsterId]?.name ?? e.monsterId;
                pushLog(s, `New bestiary entry: ${beast}.`, "info");
                // first of the clan to fell a new kind of beast — a deed worth remembering.
                // Elites only, attributed to whoever carried the fight, to keep it rare and earned.
                if (e.elite) {
                  const slayerId = res.mvp?.memberId ?? res.participants[0];
                  const slayer = slayerId ? s.members.find((x) => x.id === slayerId) : undefined;
                  if (slayer && !slayer.isLord) {
                    addMark(
                      slayer,
                      "slayer",
                      `First of ${s.clanName} to bring down ${beast}, in ${zoneName}.`,
                      {
                        bound: "kills",
                        where: zoneName,
                      },
                    );
                  }
                }
              }
            }
          }
          for (const [item, qty] of Object.entries(res.shotsUsed)) {
            s.inventory[item] = Math.max(0, (s.inventory[item] ?? 0) - qty);
          }

          for (const [item, qty] of Object.entries(res.scrollsUsed ?? {})) {
            s.inventory[item] = Math.max(0, (s.inventory[item] ?? 0) - qty);
          }
          for (const note of (res.scrollNotes ?? []).slice(0, 3)) {
            pushLog(s, note, note.includes("turned on") ? "bad" : "info");
          }
          if (res.scrollAttempts?.length) {
            s.scrollLog = [...(s.scrollLog ?? []), ...res.scrollAttempts].slice(-SCROLL_LOG_CAP);
          }

          for (const id of res.participants) {
            const m = s.members.find((x) => x.id === id);
            if (!m) continue;

            // lifetime record
            const rec = res.record?.[m.id];
            if (rec) {
              m.mobKills = (m.mobKills ?? 0) + rec.mobKills;
              m.pvpKills = (m.pvpKills ?? 0) + rec.pvpKills;
              m.pkKills = (m.pkKills ?? 0) + rec.pkKills;
            }
            if (res.fallen.includes(m.id)) m.deaths = (m.deaths ?? 0) + 1;

            // vitals
            const v = res.vitals[m.id];
            if (v) {
              m.hp = Math.min(maxHp(m), v.hp);
              m.mp = Math.min(maxMp(m), v.mp);
            }

            // character xp (capped at 52)
            if (m.level < MAX_LEVEL) {
              m.xp += Math.round(
                res.xp *
                  (lordLed ? 1 + LORD_BONUS.xp : 1) *
                  tide.spoilMult *
                  (1 + (traitField(m.trait).xp ?? 0)),
              );
              while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level)) {
                m.xp -= xpForLevel(m.level);
                m.level += 1;
                pushLog(s, `${m.name} reached level ${m.level}.`, "good");
                if (m.level % 10 === 0 || m.level === MAX_LEVEL) {
                  addMark(
                    m,
                    "ascend",
                    `Came into their strength at level ${m.level}, out in ${zoneName}.`,
                    {
                      bound: "level",
                      where: zoneName,
                    },
                  );
                }
              }
              if (m.level >= MAX_LEVEL) m.xp = 0;
            }

            // skill mastery xp
            const uses = res.skillUses[m.id] ?? {};
            for (const sk of m.skills) {
              const n = uses[sk.skillId] ?? 0;
              if (!n || sk.level >= MAX_SKILL_LEVEL) continue;
              sk.xp += n * 3;
              while (sk.level < MAX_SKILL_LEVEL && sk.xp >= xpForSkillLevel(sk.level)) {
                sk.xp -= xpForSkillLevel(sk.level);
                sk.level += 1;
                if (sk.level % 10 === 0)
                  pushLog(
                    s,
                    `${m.name}'s ${SKILL_BY_ID[sk.skillId]?.name} reached mastery ${sk.level}.`,
                    "good",
                  );
              }
            }
          }

          // backgrounds that lived up to themselves earn the clan Inspiration
          if (res.deeds.length) {
            s.inspiration = (s.inspiration ?? 0) + res.deeds.length;
            const names = res.deeds
              .map((d) => s.members.find((x) => x.id === d.memberId)?.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(", ");
            pushLog(
              s,
              `Inspiration earned (+${res.deeds.length}) — ${names} lived up to their past.`,
              "good",
            );
          }

          // the butcher's bill — some of the fallen never get up again
          const zone = ZONE_BY_ID[zoneId];
          const lostThisRun: { id: string; name: string }[] = [];
          if (zone) {
            const risk0 = deathRisk(s, party, zone.kind, zone.reqLevel);
            for (const id of res.participants) {
              const m = s.members.find((x) => x.id === id);
              if (!m) continue;
              if (!res.fallen.includes(m.id)) continue;
              // the dead are bolder in the dark — the Long Night bites harder (§5)
              const risk =
                (deathRisk(s, party, zone.kind, zone.reqLevel, m) || risk0) * tide.deathMult;
              if (m.isLord) {
                // the Lord is dragged out alive, but it costs
                if (Math.random() < risk) {
                  m.xp = 0;
                  m.hp = 1;
                  pushLog(
                    s,
                    `${m.name} was cut down and carried from ${zone.name} barely breathing.`,
                    "bad",
                  );
                  chronicle(
                    s,
                    "loss",
                    `${m.name} nearly dies at ${zone.name}`,
                    "The Lord's banner was pulled from the field under shields. The clan does not speak of it.",
                  );
                }
                continue;
              }
              if (Math.random() < risk) {
                lostThisRun.push({ id: m.id, name: m.name });
                s.members = s.members.filter((x) => x.id !== m.id);
                for (const pp of s.parties) pp.memberIds = pp.memberIds.filter((x) => x !== m.id);
                s.memorial = s.memorial ?? [];
                s.memorial.unshift({
                  id: m.id,
                  name: m.name,
                  classId: m.classId,
                  level: m.level,
                  at: Date.now(),
                  where: zone.name,
                  mobKills: m.mobKills ?? 0,
                  oath: m.oath,
                });
                pushLog(
                  s,
                  `${m.name} died in ${zone.name}. There was no body to bring home.`,
                  "bad",
                );
                // the Compact honours a policy in force (§6.3) — full-loot stings less
                if (insured(s, now)) {
                  const payout = insurePayout(m.level);
                  s.gold += payout;
                  pushLog(s, `The Compact paid out ${payout} gold on ${m.name}'s policy.`, "good");
                }
                chronicle(
                  s,
                  "loss",
                  `${m.name} falls at ${zone.name}`,
                  `Level ${m.level} ${CLASS_BY_ID[m.classId]?.name ?? "champion"}, ${(m.mobKills ?? 0).toLocaleString()} kills. Name carved into the shrine wall.`,
                );
                toast.error(`${m.name} is dead.`);
              }
            }
          }

          // Holding the line through the Long Night is a Deed worth remembering (§5).
          // The first banner to keep the field while the sky is swallowed earns it,
          // once per Night — provided it wasn't a rout.
          if (
            s.longNight?.endsAt &&
            !s.longNight.held &&
            lostThisRun.length < party.memberIds.length
          ) {
            s.longNight.held = true;
            const zoneName2 = ZONE_BY_ID[zoneId]?.name ?? "the field";
            chronicle(
              s,
              "war",
              "Held the line through the Long Night",
              `${party.name} kept the field at ${zoneName2} while the upper Ash swallowed the sun. When the light-fearing things poured out, the banner did not come down.`,
            );
            pushLog(
              s,
              `${party.name} held the line through the Long Night — a Deed for the Chronicle.`,
              "good",
            );
          }

          // ---- Scars & Deeds — the run leaves its mark on those who lived it ----
          {
            const where = zone?.name ?? zoneName;
            const here = (mid: string) => s.members.find((x) => x.id === mid);
            const standing = res.participants.filter(
              (id) => (res.vitals[id]?.hp ?? 0) > 0 && here(id),
            );

            // last one standing — walked out of a fight the others went down in
            if (res.success && standing.length === 1 && res.participants.length > 1) {
              const m = here(standing[0]!);
              if (m && !m.isLord)
                addMark(
                  m,
                  "clutch",
                  `Last banner standing at ${where} — walked out of a fight the others went down in.`,
                  {
                    bound: "resolve",
                    where,
                  },
                );
            }

            // grief — survivors of a run where a comrade was lost for good.
            // A severed shield-bond cuts deeper than a comrade merely known.
            if (lostThisRun.length) {
              for (const id of res.participants) {
                const m = here(id);
                if (!m) continue; // the lost themselves are gone from the roster
                const bondedLost = lostThisRun.filter((f) => getAffinity(s, m.id, f.id) >= BOND_AT);
                if (bondedLost.length) {
                  const names = bondedLost.map((f) => f.name).join(", ");
                  addMark(
                    m,
                    "survivor",
                    `${names} was ${m.name}'s shield-bond. ${m.name} walked out of ${where}; something in them did not.`,
                    {
                      bound: "grief",
                      where,
                    },
                  );
                  // grief pulls a survivor back from the others, too — they
                  // withdraw, and their remaining bonds cool
                  for (const bond of bondsOf(s, m.id))
                    if (bond.value > 0) bumpAffinity(s, m.id, bond.id, -1.5);
                } else {
                  const lostNames = lostThisRun.map((f) => f.name).join(", ");
                  addMark(
                    m,
                    "survivor",
                    `Marched home from ${where} without ${lostNames}. Some part of them stayed behind.`,
                    {
                      bound: "grief",
                      where,
                    },
                  );
                }
              }
              // the bonds to the departed are severed
              for (const f of lostThisRun) dropAffinity(s, f.id);
            }

            // bonds — shared danger forges affinity between those who came back
            // together, and how HARD-WON the run was decides how fast: routine
            // farming barely bonds; a close, elite, or Long-Night fight forges
            // it several times faster. A clear defeat can sour a pairing instead.
            const survived = res.participants.filter((id) => here(id));
            if (res.success) {
              const threat = ZONE_BY_ID[zoneId]?.threat ?? 1;
              const ratio = partyPower(s, party) / Math.max(1, threat);
              let gain = 0.6;
              if (ratio < 1.15) gain += 1.4;
              else if (ratio < 1.6) gain += 0.6;
              if (res.encounters?.some((e) => e.elite)) gain += 0.5;
              if (longNightActive(s, now)) gain += 0.7;
              for (let i = 0; i < survived.length; i++) {
                for (let j = i + 1; j < survived.length; j++) {
                  const before = getAffinity(s, survived[i]!, survived[j]!);
                  const after = bumpAffinity(s, survived[i]!, survived[j]!, gain);
                  if (before < BOND_AT && after >= BOND_AT) {
                    const a = here(survived[i]!);
                    const b = here(survived[j]!);
                    if (a && b) {
                      addMark(
                        a,
                        "bond",
                        `Fought through enough beside ${b.name} to trust no one else at their back.`,
                        { bound: "loyalty" },
                      );
                      addMark(
                        b,
                        "bond",
                        `Fought through enough beside ${a.name} to trust no one else at their back.`,
                        { bound: "loyalty" },
                      );
                    }
                  }
                }
              }
            } else {
              // a beating breeds blame — some pairings sour toward rivalry
              for (let i = 0; i < survived.length; i++) {
                for (let j = i + 1; j < survived.length; j++) {
                  if (Math.random() > 0.22) continue;
                  const before = getAffinity(s, survived[i]!, survived[j]!);
                  const after = bumpAffinity(s, survived[i]!, survived[j]!, -1.2);
                  if (before > RIVAL_AT && after <= RIVAL_AT) {
                    const a = here(survived[i]!);
                    const b = here(survived[j]!);
                    if (a && b)
                      pushLog(
                        s,
                        `${a.name} and ${b.name} came to blame each other for ${where}. A rivalry festers.`,
                        "bad",
                      );
                  }
                }
              }
            }

            // valor — carried the fight on the hardest runs
            if (res.mvp && (res.rating === "S" || res.rating === "A")) {
              const m = here(res.mvp.memberId);
              if (m && !m.isLord && Math.random() < 0.5)
                addMark(
                  m,
                  "valor",
                  `Carried the banner through ${where} — ${res.mvp.damage.toLocaleString()} damage when the line nearly broke.`,
                  {
                    bound: "STR",
                    where,
                  },
                );
            }

            // wounded — dragged out at a hair's breadth; the body remembers
            for (const id of res.participants) {
              const m = here(id);
              if (!m || m.isLord) continue;
              const v = res.vitals[id];
              if (!v || v.hp <= 0) continue;
              if (v.hp / Math.max(1, maxHp(m)) < 0.1 && Math.random() < 0.4) {
                const part = WOUND_PARTS[Math.floor(Math.random() * WOUND_PARTS.length)]!;
                addMark(
                  m,
                  "wounded",
                  `Cut down to nothing at ${where} and carried out breathing — the ${part} never set right after.`,
                  {
                    bound: "CON",
                    where,
                  },
                );
              }
            }
          }

          // deeds earn names
          for (const id of res.participants) {
            const m = s.members.find((x) => x.id === id);
            if (!m) continue;
            const t = earnedTitle(m, s);
            if (t && t !== m.title) {
              m.title = t;
              pushLog(s, `${m.name} is now called ${t}.`, "good");
            }
          }

          // contract boards progress
          for (const board of [s.daily, s.weekly, s.monthly]) {
            if (!board) continue;
            for (const dm of board.missions) {
              const def = DAILY_BY_ID[dm.id];
              if (!def || def.zoneId !== zoneId || dm.claimed) continue;
              if (dm.progress < def.kills) {
                dm.progress = Math.min(def.kills, dm.progress + res.kills);
                if (dm.progress >= def.kills)
                  pushLog(s, `Contract ready to claim: ${def.name}.`, "good");
              }
            }
          }

          for (const h of res.highlights ?? []) {
            pushLog(s, h.text, "good");
          }
          if (res.mvp && res.success) {
            pushLog(
              s,
              `${res.mvp.name} carried the fight — ${res.mvp.damage.toLocaleString()} damage dealt.`,
              "info",
            );
          }
          const ratingNote = res.rating ? ` [Rank ${res.rating}]` : "";
          pushLog(s, `${res.text}${ratingNote}`, res.success ? "good" : "bad");

          // keep farming the same zone until the banner is recalled
          const standing = party.memberIds.some(
            (id) => (s.members.find((x) => x.id === id)?.hp ?? 0) > 0,
          );
          if (party.farming && standing) {
            const z = ZONE_BY_ID[party.farming];
            if (z) party.run = { zoneId: z.id, endsAt: Date.now() + z.durationMs };
          } else if (party.farming) {
            party.farming = null;
            pushLog(s, `${party.name} was wiped out and dragged home to recover.`, "bad");
          }
        }
      });
    }, 500);
    return () => clearInterval(t);
  }, [update]);

  /** automatic HP / MP recovery — the wounded and the fallen all mend over time */
  useEffect(() => {
    const t = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      const needs = cur.members.some((m) => m.hp < maxHp(m) || m.mp < maxMp(m));
      if (!needs) return;
      update((s) => {
        const rest = keepEffects(s).restMult;
        const busy = new Set(s.parties.filter((p) => p.run).flatMap((p) => p.memberIds));
        for (const m of s.members) {
          const rate = regenRate(m) * (busy.has(m.id) ? 0.35 : rest);
          const wasDown = m.hp <= 0;
          m.hp = Math.min(maxHp(m), Math.round(m.hp + maxHp(m) * 0.06 * rate));
          m.mp = Math.min(maxMp(m), Math.round(m.mp + maxMp(m) * 0.08 * rate));
          if (wasDown && m.hp > 0) pushLog(s, `${m.name} is back on their feet.`, "info");
        }
      });
    }, 1500);
    return () => clearInterval(t);
  }, [update]);

  /** the training yard drills whoever is resting at the keep */
  useEffect(() => {
    const t = setInterval(() => {
      const cur = stateRef.current;
      if (!cur) return;
      if (!keepEffects(cur).yardXp) return;
      update((s) => {
        const gain = keepEffects(s).yardXp;
        const busy = new Set(s.parties.filter((p) => p.run).flatMap((p) => p.memberIds));
        for (const m of s.members) {
          if (busy.has(m.id) || m.hp <= 0 || m.level >= MAX_LEVEL) continue;
          m.xp += gain;
          while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level)) {
            m.xp -= xpForLevel(m.level);
            m.level += 1;
            pushLog(s, `${m.name} reached level ${m.level} at the training yard.`, "good");
          }
          if (m.level >= MAX_LEVEL) m.xp = 0;
        }
      });
    }, 5000);
    return () => clearInterval(t);
  }, [update]);

  /** the living realm — the world quietly does something whether or not you act:
   * champions mutter by the fire, banners write home, rumor drifts through the
   * realm, and once a "day" (2 real hours) an event turns and brings its boon. */
  const livingRef = useRef(0);
  useEffect(() => {
    const DAY_MS = 2 * 60 * 60 * 1000;
    const t = setInterval(() => {
      const cur = stateRef.current;
      if (!cur || cur.members.length === 0) return;
      const now = Date.now();
      const dayIdx = Math.floor(now / DAY_MS);
      const dayTag = `d${dayIdx}`;
      const seed = Math.floor(now / 60000);
      update((s) => {
        // once per day: the realm's turning event and any boon it carries
        if (s.livingDay !== dayTag) {
          s.livingDay = dayTag;
          const ev = realmEvent(dayIdx);
          if (ev) {
            if (ev.boon?.gold) s.gold += ev.boon.gold;
            if (ev.boon?.rep) s.reputation += ev.boon.rep;
            if (ev.boon?.inspiration) s.inspiration = (s.inspiration ?? 0) + ev.boon.inspiration;
            if (ev.boon?.favor) awardFavor(s, ev.boon.favor);
            pushLog(s, `${ev.title} — ${ev.text}`, ev.boon ? "good" : "info");
            // the saga writes itself — notable turnings are kept in the Chronicle
            if (ev.boon?.favor || ev.boon?.rep) chronicle(s, "rise", ev.title, ev.text);
          }
          return;
        }
        // otherwise a quiet line of ambient life, rotating through categories
        const cat = livingRef.current++ % 4;
        if (cat === 0) {
          const resting = s.members.filter(
            (m) => m.hp > 0 && !s.parties.some((p) => p.run && p.memberIds.includes(m.id)),
          );
          const m = resting[seed % Math.max(1, resting.length)];
          if (m) pushLog(s, champChatter(m, CLASS_BY_ID[m.classId]?.role ?? "blade", seed), "info");
        } else if (cat === 1) {
          const deployed = s.parties.filter((p) => p.run || p.travel || p.farming);
          const p = deployed[seed % Math.max(1, deployed.length)];
          if (p) {
            const zid = p.run?.zoneId ?? p.travel?.zoneId ?? p.farming ?? "";
            pushLog(s, fieldLetter(p.name, ZONE_BY_ID[zid]?.name ?? "the field", seed), "info");
          } else {
            pushLog(s, realmRumor(seed), "info");
          }
        } else if (cat === 2) {
          pushLog(s, realmRumor(seed), "info");
        } else {
          pushLog(s, atmosphere(timeOfDay(now).phase, seed), "info");
        }
      });
    }, 75000);
    return () => clearInterval(t);
  }, [update]);

  /** the realm moves whether you watch it or not — and its tidings, especially
   * its losses, are surfaced rather than left to sink silently into the feed */
  useEffect(() => {
    const t = setInterval(() => {
      if (!stateRef.current) return;
      update((s) => {
        const markId = s.log[0]?.id; // newest entry before the pulse
        realmPulse(s);
        musterPulse(s);
        // everything the pulse just prepended, up to the mark
        const fresh: { text: string; tone: "good" | "bad" | "info" }[] = [];
        for (const e of s.log) {
          if (e.id === markId) break;
          fresh.push(e);
        }
        const losses = fresh.filter((e) => e.tone === "bad");
        if (losses.length === 1) {
          toast.error("Ill tidings from the realm.", { description: losses[0]!.text });
        } else if (losses.length > 1) {
          toast.error(`${losses.length} ill tidings from the realm.`, {
            description: losses[losses.length - 1]!.text,
          });
        }
      });
    }, 15000);
    return () => clearInterval(t);
  }, [update]);

  /** the war-logistics domain works its nodes, hauls caravans and crafts goods
   * on its own clock — the supply chain runs whether or not you watch it */
  useEffect(() => {
    const t = setInterval(() => {
      const cur = stateRef.current;
      if (!cur?.domain) return;
      const now = Date.now();
      // only tick when there's meaningful elapsed time, to avoid churn
      if (now - cur.domain.tickAt < 8000) return;
      const lastRaidAt = cur.domain.raids?.[0]?.at ?? 0;
      update((s) => {
        if (!s.domain) return;
        s.domain = advanceDomain(s.domain, now, { longNight: longNightActive(s, now) });
        // a caravan skimmed on the road was only a map flash before — put it in
        // the field report and raise a toast so the loss is never missed
        const top = s.domain.raids?.[0];
        if (top && top.at > lastRaidAt && top.lost > 0) {
          const lost = Math.round(top.lost);
          pushLog(
            s,
            `Raiders skimmed a caravan — ${lost} ${RAW_LABEL[top.raw]} lost on the road.`,
            "bad",
          );
          toast.error("A caravan was raided.", {
            description: `${lost} ${RAW_LABEL[top.raw]} lost on the road.`,
          });
        }
      });
    }, 10000);
    return () => clearInterval(t);
  }, [update]);

  const api = {
    start: (founding: Founding) => setState(initialState(founding)),
    reset: () => {
      window.localStorage.removeItem(KEY);
      setState(null);
    },

    refreshRecruits: () =>
      update((s) => {
        const cost = 150 * Math.max(1, s.clanLevel);
        if (s.gold < cost) return void toast.error("Not enough gold to send out heralds.");
        s.gold -= cost;
        s.recruits = rollRecruits(Math.max(1, s.clanLevel));
      }),

    recruit: (id: string, opts?: { name?: string; oath?: string }) =>
      update((s) => {
        const r = s.recruits.find((x) => x.id === id);
        if (!r) return;
        if (s.members.length >= clanCapacity(s.clanLevel, keepLevel(s, "barracks"), !!s.allegiance))
          return void toast.error(
            s.clanLevel < 1
              ? "Your company is full — found a clan to swear more blades."
              : "Clan is at capacity — raise the clan level.",
          );
        const cost = recruitCost(r);
        if (s.gold < cost) return void toast.error("Not enough gold.");
        s.gold -= cost;
        // the player's own choice, made before any risk — this is where attachment starts
        const name = (opts?.name ?? "").trim().slice(0, 24) || r.name;
        const oath = (opts?.oath ?? "").trim().slice(0, 80);
        s.recruits = s.recruits.filter((x) => x.id !== id);
        const sworn: Member = { ...r, name, partyId: null, joinedAt: Date.now() };
        // the swearing-in is their first remembered moment — authored by the player
        addMark(
          sworn,
          "oath",
          oath ? `Sworn to ${s.clanName} — “${oath}.”` : `Sworn to ${s.clanName}.`,
          {
            bound: "oath",
          },
        );
        s.members.push(sworn);
        pushLog(s, `${name} swore the clan oath.`, "info");
      }),

    dismiss: (memberId: string) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        if (m.isLord) return void toast.error("You cannot dismiss yourself.");
        s.members = s.members.filter((x) => x.id !== memberId);
        for (const p of s.parties) p.memberIds = p.memberIds.filter((x) => x !== memberId);
        dropAffinity(s, memberId);
        pushLog(s, `${m.name} left the clan.`, "bad");
      }),

    createParty: () =>
      update((s) => {
        if (s.parties.length >= maxParties(s.clanLevel, !!s.allegiance))
          return void toast.error(
            s.clanLevel < 1
              ? "Found your clan before raising a second banner."
              : "Raise the clan level to field another party.",
          );
        s.parties.push({
          id: uid(),
          name: `Banner ${s.parties.length + 1}`,
          memberIds: [],
          run: null,
        });
      }),

    /** rounds out a banner with the champions that best fill its missing roles */
    autoFillParty: (partyId: string) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        if (!p) return;
        if (p.run) return void toast.error("That party is on an expedition.");
        const picks = suggestFill(s, p);
        if (!picks.length) return void toast.error("No free champions to draft.");
        for (const m of picks) {
          for (const q of s.parties) q.memberIds = q.memberIds.filter((x) => x !== m.id);
          p.memberIds.push(m.id);
          const live = s.members.find((x) => x.id === m.id);
          if (live) live.partyId = p.id;
        }
        pushLog(s, `${p.name} drafted ${picks.length} champion(s).`, "info");
      }),

    /** fills every idle banner in one order */
    autoFillAll: () =>
      update((s) => {
        let n = 0;
        for (const p of s.parties) {
          if (p.run) continue;
          for (const m of suggestFill(s, p)) {
            for (const q of s.parties) q.memberIds = q.memberIds.filter((x) => x !== m.id);
            p.memberIds.push(m.id);
            const live = s.members.find((x) => x.id === m.id);
            if (live) live.partyId = p.id;
            n++;
          }
        }
        if (!n) return void toast.error("Nothing left to draft.");
        pushLog(s, `The war table filled ${n} empty seat(s).`, "info");
      }),

    /* --------------------------- home-city actions -------------------------- */

    /** Rest the wounded at the warded flame — heals the banners standing in the hall. */
    restAtFlameHeal: () =>
      update((s) => {
        if (!bannersInCity(s).length) return void toast.error("No banner is in the hall.");
        const bill = flameRestBill(s);
        if (!bill.wounded.length)
          return void toast.error("The garrison is hale — none need the flame.");
        if (s.gold < bill.gold) return void toast.error(`The flame rite asks ${bill.gold} gold.`);
        s.gold -= bill.gold;
        for (const m of bill.wounded) {
          const mh = maxHp(m);
          const mm = maxMp(m);
          m.hp = Math.min(mh, Math.round(m.hp + (mh - m.hp) * FLAME_REST_FRACTION));
          m.mp = Math.min(mm, Math.round(m.mp + (mm - m.mp) * FLAME_REST_FRACTION));
        }
        pushLog(
          s,
          `The wounded rested at the warded flame — the hall's banners recover (${bill.gold} gold).`,
          "good",
        );
        toast.success(`${bill.wounded.length} champion(s) rest at the flame`);
      }),

    /** Muster the militia — fills the empty seats of the banners standing in the hall. */
    musterMilitia: () =>
      update((s) => {
        const inCity = bannersInCity(s);
        if (!inCity.length) return void toast.error("No banner is in the hall.");
        let n = 0;
        for (const p of inCity) {
          for (const m of suggestFill(s, p)) {
            for (const q of s.parties) q.memberIds = q.memberIds.filter((x) => x !== m.id);
            p.memberIds.push(m.id);
            const live = s.members.find((x) => x.id === m.id);
            if (live) live.partyId = p.id;
            n++;
          }
        }
        if (!n) return void toast.error("No champions free to muster.");
        pushLog(s, `The militia mustered — ${n} champion(s) took the hall's empty seats.`, "info");
        toast.success(`Mustered ${n} into the hall`);
      }),

    /** sends the whole banner back to the unassigned tray */
    clearParty: (partyId: string) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        if (!p) return;
        if (p.run) return void toast.error("That party is on an expedition.");
        for (const id of p.memberIds) {
          const m = s.members.find((x) => x.id === id);
          if (m) m.partyId = null;
        }
        p.memberIds = [];
      }),

    /** renames a banner so orders read clearly on the table */
    renameParty: (partyId: string, name: string) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        if (!p) return;
        const clean = name.trim().slice(0, 24);
        if (clean) p.name = clean;
      }),

    assign: (memberId: string, partyId: string | null) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        for (const p of s.parties) {
          if (p.run && (p.memberIds.includes(memberId) || p.id === partyId))
            return void toast.error("That party is on an expedition.");
        }
        for (const p of s.parties) p.memberIds = p.memberIds.filter((x) => x !== memberId);
        if (partyId) {
          const p = s.parties.find((x) => x.id === partyId);
          if (!p) return;
          if (p.memberIds.length >= MAX_PARTY_SIZE)
            return void toast.error(`Party is full (${MAX_PARTY_SIZE}).`);
          p.memberIds.push(memberId);
        }
        m.partyId = partyId;
      }),

    sendParty: (partyId: string, zoneId: string, atlasLoc?: string) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        const z = ZONES.find((x) => x.id === zoneId);
        if (!p || !z) return;
        if (p.run || p.travel) return;
        if (p.memberIds.length === 0) return void toast.error("Empty party.");
        const travelMs = travelMsTo(zoneId);
        p.travel = { zoneId, arrivesAt: Date.now() + travelMs };
        p.farming = zoneId;
        // remember exactly where on the atlas it was sent, so it's drawn there
        p.atlasLoc = atlasLoc;
        pushLog(
          s,
          `${p.name} set out to march on ${z.name} — ${Math.round(travelMs / 1000)}s on the road.`,
          "info",
        );
      }),

    setPartyStance: (partyId: string, stance: Stance) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        if (p) p.stance = stance;
      }),

    /** Denormalise which realms the clan holds in the shared war (with their
     * development) so runs pay spoils scaled by how developed each realm is. */
    setWarSpoils: (held: Array<{ id: string; dev: number; pop?: number }>) =>
      update((s) => {
        const cur = s.warSpoils?.held ?? [];
        const same =
          cur.length === held.length &&
          cur.every(
            (h, i) =>
              h.id === held[i]?.id &&
              Math.round(h.dev) === Math.round(held[i]!.dev) &&
              Math.round(h.pop ?? 0) === Math.round(held[i]!.pop ?? 0),
          );
        if (same) return;
        s.warSpoils = { held };
      }),

    /** Cache the authoritative server war so the offline view shows its real
     * last-known state, never a divergent local sim. */
    cacheFrontier: (fr: FrontierState) =>
      update((s) => {
        if (s.frontier && s.frontier.updatedAt >= fr.updatedAt) return; // already current
        s.frontier = fr;
      }),

    /** Answer one of the King's charges — pay any tribute due, collect favor and
     * the crown's reward, climb the vassal ladder, and take a fresh charge. */
    claimCharge: (id: string) =>
      update((s) => {
        if (!s.court) return;
        const charge = s.court.charges.find((c) => c.id === id);
        if (!charge) return;
        const prog = chargeProgress(s, charge);
        if (!prog.ready) return void toast("That charge is not yet fulfilled.");
        // a tithe is paid in coin on delivery
        if (charge.kind === "tithe") {
          if (s.gold < charge.need)
            return void toast.error(`The treasury needs ${charge.need} gold for this tithe.`);
          s.gold -= charge.need;
        }
        s.gold += charge.gold;
        s.reputation += charge.rep;
        // clear the charge and let the King set another
        s.court.charges = s.court.charges.filter((c) => c.id !== id);
        fillCharges(s.court, s);

        const reward = [
          `+${charge.favor} favor`,
          charge.gold ? `${charge.gold} gold` : "",
          charge.rep ? `${charge.rep} rep` : "",
        ]
          .filter(Boolean)
          .join(" · ");
        pushLog(s, `Charge answered: ${charge.title}. ${reward}.`, "good");
        toast.success(`The crown is pleased — ${charge.title}.`, { description: reward });

        // grant favor (and handle any rank-up / coronation it triggers)
        awardFavor(s, charge.favor);
      }),

    /** Spend royal favor on a boon — the sink that ties the court back into the
     * war (supply), the roster (healing) and the domain (laborers). */
    petitionBoon: (id: BoonId) =>
      update((s) => {
        if (!s.court) return;
        const def = BOONS[id];
        const gate = canPetition(s, id);
        if (!gate.ok) return void toast.error(gate.why);
        const rank = courtRankIndex(courtStanding(s));
        s.court.favor = Math.max(0, s.court.favor - def.cost);
        if (id === "charter") {
          const ship = charterSupply(rank);
          const cap = supplyCap(s);
          s.supply = Math.min(cap, (s.supply ?? 0) + ship);
          pushLog(
            s,
            `The crown grants a War Charter — ${ship} supply shipped to the front.`,
            "good",
          );
          toast.success("War Charter granted.", { description: `+${ship} war supply.` });
        } else if (id === "healers") {
          const wounded = s.members.filter((m) => (m.wound ?? 0) > 0).length;
          for (const m of s.members) m.wound = undefined;
          pushLog(s, `The King's healers ride out — the warband's wounds are mended.`, "good");
          toast.success("Royal Healers dispatched.", {
            description: wounded
              ? `${wounded} champion${wounded === 1 ? "" : "s"} made whole.`
              : "The ranks are already hale.",
          });
        } else {
          const n = musterLaborers(rank);
          if (s.domain) s.domain.workers += n;
          pushLog(s, `A royal Muster Writ levies ${n} laborers to your domain.`, "good");
          toast.success("Muster Writ granted.", { description: `+${n} domain laborers.` });
        }
      }),

    /** Apply the spoils of a tactical proving — xp to the champions who fought,
     * gold/reputation to the clan, favor toward the court, and a tally for the
     * King's patrol charges. Champions cannot die in the proving, so no hp is
     * written back. */
    finishTactics: (participantIds: string[], reward: TacReward, downedIds: string[] = []) =>
      update((s) => {
        s.gold += Math.max(0, Math.round(reward.gold));
        s.reputation += Math.max(0, Math.round(reward.rep));
        if (s.court) s.court.stats.runs += 1;
        awardFavor(s, reward.favor);
        for (const id of participantIds) {
          const m = s.members.find((x) => x.id === id);
          if (!m || m.level >= MAX_LEVEL || reward.xp <= 0) continue;
          m.xp += reward.xp;
          while (m.level < MAX_LEVEL && m.xp >= xpForLevel(m.level)) {
            m.xp -= xpForLevel(m.level);
            m.level += 1;
            pushLog(s, `${m.name} reached level ${m.level}.`, "good");
          }
          if (m.level >= MAX_LEVEL) m.xp = 0;
        }
        // a Blooded bout leaves lasting wounds on any champion who was downed
        if (reward.blooded) {
          for (const id of downedIds) {
            const m = s.members.find((x) => x.id === id);
            if (!m) continue;
            m.wound = Math.min(12, (m.wound ?? 0) + 2);
            pushLog(s, `${m.name} carries wounds from the Blooded proving.`, "bad");
          }
        }
        pushLog(
          s,
          reward.won
            ? `The banner takes the ${reward.blooded ? "Blooded " : ""}proving — ${reward.gold} gold, +${reward.favor} favor.`
            : `The banner is bested in the proving, but learns from the bout.`,
          reward.won ? "good" : "info",
        );
      }),

    /** Mark an atlas place as scouted, so it is no longer shrouded on the map. */
    discover: (locId: string) =>
      update((s) => {
        s.discovered = s.discovered ?? [];
        if (!s.discovered.includes(locId)) s.discovered.push(locId);
      }),

    /** Spend war supply to commit a banner to the front (returns nothing; the
     * caller has already checked there is enough). */
    spendSupply: (n: number) =>
      update((s) => {
        s.supply = Math.max(0, (s.supply ?? 0) - Math.max(0, n));
      }),

    /** Tend the warband's lingering wounds at the infirmary, for gold. */
    tendWounds: () =>
      update((s) => {
        const wounded = s.members.filter((m) => (m.wound ?? 0) > 0);
        const points = wounded.reduce((n, m) => n + (m.wound ?? 0), 0);
        if (points === 0) return void toast("No one carries wounds.");
        const cost = Math.round(points * 40 * keepEffects(s).mendCost);
        if (s.gold < cost) return void toast.error(`The infirmary asks ${cost} gold.`);
        s.gold -= cost;
        for (const m of wounded) m.wound = undefined;
        pushLog(s, `The infirmary tends the warband's wounds (${cost} gold).`, "good");
        toast.success("The wounded are made whole.");
      }),

    /* --------------------------- war logistics ---------------------------- */

    /** Hire laborers into the domain's workforce. */
    hireWorkers: (n: number) =>
      update((s) => {
        if (!s.domain || n <= 0) return;
        const cost = n * HIRE_COST;
        if (s.gold < cost) return void toast.error(`Hiring ${n} asks ${cost} gold.`);
        s.gold -= cost;
        s.domain.workers += n;
        pushLog(s, `Hired ${n} laborer${n === 1 ? "" : "s"} to the domain (${cost} gold).`, "info");
      }),

    /** Call up levies — free laborers from the populace of your held realms. */
    callLevies: () =>
      update((s) => {
        if (!s.domain) return;
        const now = Date.now();
        const levy = realmLevy(s, now);
        if (levy.count <= 0)
          return void toast("Hold a realm on the frontier to call up its people.");
        if (!levy.ready)
          return void toast(`The levies muster again in ${Math.ceil(levy.readyIn / 60000)}m.`);
        s.domain.workers += levy.count;
        s.domain.leviedAt = now;
        pushLog(
          s,
          `You call up ${levy.count} laborer${levy.count === 1 ? "" : "s"} from your realms to work the domain.`,
          "good",
        );
        toast.success("Levies called up.", {
          description: `+${levy.count} laborers from your held realms.`,
        });
      }),

    /** Move a worker onto or off a node (delta +1 / −1). */
    assignWorker: (nodeId: string, delta: number) =>
      update((s) => {
        const node = s.domain?.nodes.find((n) => n.id === nodeId);
        if (!s.domain || !node) return;
        if (delta > 0) {
          if (freeWorkers(s.domain) <= 0) return void toast("No idle laborers to assign.");
          if (node.workers >= WORKER_CAP_PER_NODE) return void toast("The node is fully manned.");
          node.workers += 1;
        } else if (node.workers > 0) {
          node.workers -= 1;
        }
      }),

    /** Break new ground: raise a resource node (costs gold and domain timber). */
    buildNode: (type: NodeType) =>
      update((s) => {
        if (!s.domain) return;
        const def = NODE_DEF[type];
        const timber = s.domain.stock.timber ?? 0;
        if (s.gold < def.gold) return void toast.error(`That asks ${def.gold} gold.`);
        if (timber < def.timber) return void toast.error(`That asks ${def.timber} timber.`);
        s.gold -= def.gold;
        s.domain.stock.timber = timber - def.timber;
        s.domain.nodes.push({ id: uid(), type, level: 1, workers: 0, raw: 0 });
        pushLog(s, `Raised a ${def.label} in the domain.`, "good");
      }),

    /** Deepen a node — more output per worker. */
    upgradeNode: (nodeId: string) =>
      update((s) => {
        const node = s.domain?.nodes.find((n) => n.id === nodeId);
        if (!s.domain || !node || node.level >= NODE_UPGRADE_MAX) return;
        const gold = node.level * 400;
        const timber = node.level * 20;
        if (s.gold < gold) return void toast.error(`That asks ${gold} gold.`);
        if ((s.domain.stock.timber ?? 0) < timber)
          return void toast.error(`That asks ${timber} timber.`);
        s.gold -= gold;
        s.domain.stock.timber = (s.domain.stock.timber ?? 0) - timber;
        node.level += 1;
        pushLog(s, `${NODE_DEF[node.type].label} deepened to level ${node.level}.`, "good");
      }),

    /** Build or upgrade a city workshop (mill / smithy / stable). */
    upgradeWorkshop: (w: Workshop) =>
      update((s) => {
        if (!s.domain) return;
        const level = s.domain.workshops[w] ?? 0;
        if (level >= 3) return void toast("That workshop is at its height.");
        const gold = (level + 1) * 350;
        const timber = (level + 1) * 25;
        if (s.gold < gold) return void toast.error(`That asks ${gold} gold.`);
        if ((s.domain.stock.timber ?? 0) < timber)
          return void toast.error(`That asks ${timber} timber.`);
        s.gold -= gold;
        s.domain.stock.timber = (s.domain.stock.timber ?? 0) - timber;
        s.domain.workshops[w] = level + 1;
        pushLog(
          s,
          `${w === "mill" ? "Mill & Granary" : w === "smithy" ? "Smithy" : "Stable"} raised to level ${level + 1}.`,
          "good",
        );
      }),

    /** Send a caravan to haul a node's piled raw to the city. */
    dispatchCaravan: (nodeId: string) =>
      update((s) => {
        const node = s.domain?.nodes.find((n) => n.id === nodeId);
        if (!s.domain || !node) return;
        const qty = Math.floor(node.raw);
        if (qty <= 0) return void toast("Nothing to haul yet.");
        node.raw = 0;
        s.domain.caravans.push({
          id: uid(),
          raw: NODE_DEF[node.type].raw,
          qty,
          arrivesAt: Date.now() + CARAVAN_MS,
        });
        pushLog(
          s,
          `A caravan sets out from the ${NODE_DEF[node.type].label} with ${qty} ${NODE_DEF[node.type].raw}.`,
          "info",
        );
      }),

    setSmithyFocus: (focus: SmithyFocus) =>
      update((s) => {
        if (s.domain) s.domain.smithyFocus = focus;
      }),

    /** Ship the city's finished goods to the front as war supply. */
    shipToFront: () =>
      update((s) => {
        if (!s.domain) return;
        const value = shipmentValue(s.domain);
        if (value <= 0) return void toast("No finished goods to ship.");
        const cap = supplyCap(s);
        const room = Math.max(0, cap - (s.supply ?? 0));
        if (room <= 0) return void toast("The supply train is already full.");
        // spend goods, richest-value first, until supply is capped
        let gained = 0;
        for (const g of Object.keys(s.domain.goods) as Good[]) {
          if (gained >= room) break;
          const have = Math.floor(s.domain.goods[g] ?? 0);
          if (have <= 0) continue;
          const per = SUPPLY_VALUE[g];
          const canTake = Math.min(have, Math.ceil((room - gained) / per));
          gained += canTake * per;
          s.domain.goods[g] = (s.domain.goods[g] ?? 0) - canTake;
        }
        gained = Math.min(room, gained);
        s.supply = Math.min(cap, (s.supply ?? 0) + gained);
        pushLog(s, `The supply train reaches the front — +${gained} war supply.`, "good");
        toast.success(`+${gained} war supply shipped to the front.`);
      }),

    /** Issue the domain's armour to the warband — the smithy's plate finally
     * protects the champions who fight, mending wounds (1 armour per point). */
    kitWarband: () =>
      update((s) => {
        if (!s.domain) return;
        const armour = Math.floor(s.domain.goods.armour ?? 0);
        const wounded = s.members
          .filter((m) => (m.wound ?? 0) > 0)
          .sort((a, b) => (b.wound ?? 0) - (a.wound ?? 0));
        if (wounded.length === 0) return void toast("The warband bears no wounds to mend.");
        if (armour < 1) return void toast.error("No armour in the stores to issue.");
        let remain = armour;
        let mended = 0;
        for (const m of wounded) {
          if (remain <= 0) break;
          const need = m.wound ?? 0;
          const use = Math.min(remain, need); // 1 armour mends 1 wound point
          const left = need - use;
          m.wound = left <= 0 ? undefined : left;
          remain -= use;
          mended += use;
        }
        const used = armour - remain;
        s.domain.goods.armour = (s.domain.goods.armour ?? 0) - used;
        pushLog(
          s,
          `The armory kits the warband — ${used} armour issued, ${mended} wound point${mended === 1 ? "" : "s"} mended.`,
          "good",
        );
        toast.success("The warband is kitted from the stores.", {
          description: `${used} armour issued — ${mended} wound point${mended === 1 ? "" : "s"} mended.`,
        });
      }),

    recallParty: (partyId: string) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        if (!p) return;
        p.farming = null;
        // Still on the road? Turn the banner around rather than march into an empty hunt.
        if (p.travel && !p.run) {
          p.travel = null;
          pushLog(s, `${p.name} broke off the march and is turning home.`, "info");
          return;
        }
        pushLog(s, `${p.name} will return after this run.`, "info");
      }),

    setCraftMastery: (memberId: string, mastery: CraftMastery) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        m.craftMastery = mastery;
        pushLog(s, `${m.name} devoted themselves to ${CRAFT_MASTERY_LABEL[mastery]}.`, "info");
      }),

    /** Choose (or clear) a champion's trait — their fighting build. Only a trait
     * their role and level allow may be taken. */
    setTrait: (memberId: string, trait: TraitId | null) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        const role = CLASS_BY_ID[m.classId]?.role;
        if (trait) {
          if (!role || !traitsFor(role, m.level).some((t) => t.id === trait)) return;
          m.trait = trait;
          pushLog(s, `${m.name} takes the way of the ${TRAITS[trait].name}.`, "good");
        } else {
          m.trait = undefined;
          pushLog(s, `${m.name} sets aside their trait.`, "info");
        }
      }),

    /* ------------------------------- skills ------------------------------- */

    learnSkill: (memberId: string, skillId: string) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        const def = SKILL_BY_ID[skillId];
        if (!m || !def) return;
        if (m.level < def.unlock) return void toast.error(`Requires level ${def.unlock}.`);
        if (m.skills.some((k) => k.skillId === skillId)) return;
        const price = skillCostFn(def);
        if (s.gold < price) return void toast.error("Not enough gold for the trainer.");
        s.gold -= price;
        learnSkillFn(m, skillId);
        pushLog(s, `${m.name} learned ${def.name}.`, "info");
      }),

    /** Teach every unlocked skill the clan can afford, for one member or all. */
    learnAllSkills: (memberId?: string) =>
      update((s) => {
        const targets = memberId ? s.members.filter((m) => m.id === memberId) : s.members;
        let taught = 0;
        for (const m of targets) {
          for (const def of learnableSkillsFn(m)) {
            const price = skillCostFn(def);
            if (s.gold < price) continue;
            s.gold -= price;
            learnSkillFn(m, def.id);
            taught++;
          }
        }
        if (taught === 0) return void toast.error("Nothing affordable to train right now.");
        pushLog(s, `The trainers taught ${taught} new skill${taught > 1 ? "s" : ""}.`, "info");
        toast.success(`Learned ${taught} skill${taught > 1 ? "s" : ""}.`);
      }),

    setSkillCondition: (memberId: string, skillId: string, condition: SkillCondition) =>
      update((s) => {
        const sk = s.members
          .find((x) => x.id === memberId)
          ?.skills.find((k) => k.skillId === skillId);
        if (sk) sk.condition = condition;
      }),

    moveSkill: (memberId: string, skillId: string, dir: -1 | 1) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        const list = [...m.skills].sort((a, b) => a.priority - b.priority);
        const i = list.findIndex((k) => k.skillId === skillId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return;
        [list[i]!, list[j]!] = [list[j]!, list[i]!];
        list.forEach((k, idx) => (k.priority = idx));
        m.skills = list;
      }),

    claimDaily: (id: string) =>
      update((s) => {
        const def = DAILY_BY_ID[id];
        const dm = [s.daily, s.weekly, s.monthly]
          .flatMap((b) => b?.missions ?? [])
          .find((x) => x.id === id);
        if (!def || !dm || dm.claimed) return;
        if (dm.progress < def.kills) return void toast.error("Contract not finished yet.");
        dm.claimed = true;
        s.gold += def.gold;
        s.reputation += def.rep;
        for (const r of [def.reward, def.reward2]) {
          if (r) s.inventory[r.item] = (s.inventory[r.item] ?? 0) + r.qty;
        }
        pushLog(
          s,
          `${CADENCE_LABEL[def.cadence]} contract "${def.name}" claimed — ${def.gold} gold, ${def.rep} reputation.`,
          "good",
        );
        toast.success(`Claimed ${def.name}`);
      }),

    /* ------------------------------ dawn rally ------------------------------- */

    /** Claim the daily dawn muster; consecutive days build a streak, gaps reset it. */
    claimRally: () =>
      update((s) => {
        const today = dayKey();
        const r = s.rally ?? { lastDay: "", streak: 0 };
        if (r.lastDay === today) return void toast("The banners have already rallied today.");
        const yesterday = dayKey(new Date(Date.now() - 86_400_000));
        const streak = r.lastDay === yesterday ? r.streak + 1 : 1;
        s.rally = { lastDay: today, streak };
        const rw = rallyReward(streak);
        s.gold += rw.gold;
        s.reputation += rw.rep;
        if (rw.inspiration) s.inspiration = (s.inspiration ?? 0) + rw.inspiration;
        s.rawAsh = (s.rawAsh ?? 0) + 12 + streak * 2;
        pushLog(
          s,
          `Dawn rally — day ${streak} of the muster. +${rw.gold} gold, +${rw.rep} reputation${
            rw.inspiration ? `, +${rw.inspiration} inspiration` : ""
          }.`,
          "good",
        );
        toast.success(
          rw.milestone
            ? `Dawn rally — ${streak}-day streak! A feast-day muster.`
            : `Dawn rally claimed — ${streak}-day streak.`,
        );
      }),

    /* -------------------------------- legacy --------------------------------- */

    /** Declare the Reckoning (§1.3): tally the season into the permanent Chronicle
     * and begin a new Season of Ash. A perturbation, not a wipe — everything you
     * earned endures; only the map and the meta-clocks stir anew. */
    declareReckoning: () =>
      update((s) => {
        const season = s.season ?? 1;
        const deeds = deedsFromState(s);
        const renown = renownScore(deeds);
        chronicle(
          s,
          "triumph",
          `The Season of Ash ${season} is reckoned`,
          `${renown.toLocaleString()} renown across ${deeds.length} deeds. The map is perturbed and the war begins again — but your name endures in the stone.`,
        );
        s.season = season + 1;
        // perturbation: rivals surge back stronger, their claims reset; meta-clocks clear.
        s.rivals = initialRivals().map((r) => ({
          ...r,
          power: Math.round(r.power * (1 + 0.15 * season)), // [TUNING]
        }));
        s.longNight = { pressure: 0 };
        s.ashDebt = 0;
        s.rawAsh = 0;
        pushLog(
          s,
          `The Reckoning is declared. Season ${season + 1} of the endless war begins — the realms stir anew.`,
          "info",
        );
        toast.success(`Season ${season} reckoned. The war begins again.`);
      }),

    /** A champion swears the Ashen Oath (§4.2) — irrevocable. They step forward
     * first when death comes, and their fall becomes an outsized, honoured Deed. */
    swearOath: (memberId: string) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m || m.isLord)
          return void toast("The Lord is always guarded and cannot swear the Oath.");
        if (m.oath) return void toast("Already sworn to the Ashen Oath.");
        m.oath = true;
        chronicle(
          s,
          "rise",
          `${m.name} swears the Ashen Oath`,
          "To fall rather than yield, and to be remembered for it. The Warden-Fallen make room.",
        );
        pushLog(
          s,
          `${m.name} swore the Ashen Oath — they will step forward first, and fall hardest into legend.`,
          "info",
        );
        toast.success(`${m.name} is Oathsworn.`);
      }),

    /** Carve a Deed into the Founders' Monument for a price in gold (§7.4).
     * Cosmetic only — inscription grants no power, it grants remembrance. */
    inscribeDeed: (id: string) =>
      update((s) => {
        const deed = deedsFromState(s).find((d) => d.id === id);
        if (!deed) return;
        s.inscribed = s.inscribed ?? [];
        if (s.inscribed.includes(id)) return void toast("Already carved into the Monument.");
        const cost = inscribeCost(deed);
        if (s.gold < cost) return void toast(`Need ${cost} gold to inscribe this deed.`);
        s.gold -= cost;
        s.inscribed.push(id);
        chronicle(
          s,
          "rise",
          "Inscribed at the Founders' Monument",
          `“${deed.title}” is carved into the stone for ${cost} gold. The Ash always collects — even for remembrance.`,
        );
        toast.success(`Inscribed: ${deed.title}`);
      }),

    /** Wear an earned clan title (§7.5), or bare the clan's name (null). */
    wearTitle: (titleId: string | null) =>
      update((s) => {
        if (titleId === null) {
          s.title = undefined;
          toast("The clan wears its name unadorned.");
          return;
        }
        const t = CLAN_TITLE_BY_ID[titleId];
        if (!t) return;
        const earned = earnedTitles(s).some((x) => x.id === titleId);
        if (!earned) return void toast("That honour has not been earned yet.");
        s.title = titleId;
        toast.success(`The clan is styled “${t.title}.”`);
      }),

    /* ------------------------------ world boss ------------------------------- */

    /**
     * Commit a banner to the World Boss: it breaks off farming to charge the
     * beast, then must regroup before it can charge again. Every charge risks a
     * champion's life unless the clan has prayed for a blessing today. (Damage is
     * submitted separately from the banner's power.)
     */
    commitBanner: (partyId: string, overdraw = false) =>
      update((s) => {
        const p = s.parties.find((x) => x.id === partyId);
        if (!p) return;
        const boss = bossForDay();
        // Break off whatever it was doing — the boss takes priority.
        p.run = null;
        p.travel = null;
        p.farming = null;
        s.bossCommitAt = { ...(s.bossCommitAt ?? {}), [partyId]: Date.now() };

        // Overdraw reaches past Vigour for a burst (damage handled at the strike),
        // banking Ash Debt now; and a Searing host is deadlier to field (§3.1/§3.2).
        const risk =
          COMMIT_DEATH_RISK *
          (overdraw ? ASH_DEBT.overdrawRisk : 1) *
          (isSearing(s) ? ASH_DEBT.searingRisk : 1);
        if (overdraw) s.ashDebt = (s.ashDebt ?? 0) + ASH_DEBT.overdrawDebt;

        const blessed = s.bossBlessing?.day === dayKey();
        if (!blessed && Math.random() < risk) {
          const fated = p.memberIds
            .map((id) => s.members.find((m) => m.id === id))
            .filter((m): m is NonNullable<typeof m> => !!m && !m.isLord);
          // The Oathsworn step forward first when death comes (§4.2).
          const oathsworn = fated.filter((m) => m.oath);
          const pool = oathsworn.length > 0 ? oathsworn : fated;
          const victim = pool[Math.floor(Math.random() * pool.length)];
          if (victim) {
            s.members = s.members.filter((x) => x.id !== victim.id);
            for (const pp of s.parties) pp.memberIds = pp.memberIds.filter((x) => x !== victim.id);
            s.memorial = s.memorial ?? [];
            s.memorial.unshift({
              id: victim.id,
              name: victim.name,
              classId: victim.classId,
              level: victim.level,
              at: Date.now(),
              where: boss.name,
              mobKills: victim.mobKills ?? 0,
              oath: victim.oath,
            });
            dropAffinity(s, victim.id);
            chronicle(
              s,
              "loss",
              `${victim.name} falls to ${boss.name}`,
              `Level ${victim.level} ${CLASS_BY_ID[victim.classId]?.name ?? "champion"}, cut down charging the World Boss. Name carved into the shrine wall.`,
            );
            s.ashDebt = (s.ashDebt ?? 0) + ASH_DEBT.deathAccrual;
            pushLog(
              s,
              `${victim.name} fell charging ${boss.name}. The Ash collects — the host carries the debt until it rests.`,
              "bad",
            );
            toast.error(`${victim.name} is dead.`);
          }
        }
        pushLog(s, `${p.name} broke off to charge ${boss.name}.`, "info");
      }),

    /** Take a vassal house's oath (§8.1) — a gift of gold secures their fealty. */
    swearVassal: (houseId: string) =>
      update((s) => {
        const house = VASSAL_BY_ID[houseId];
        if (!house) return;
        s.vassals = s.vassals ?? [];
        if (s.vassals.includes(houseId))
          return void toast(`${house.name} already flies your banner.`);
        if (s.clanLevel < house.reqLevel)
          return void toast(`${house.name} will only swear to a clan of level ${house.reqLevel}.`);
        if (s.gold < house.cost)
          return void toast.error(`${house.name} expects a gift of ${house.cost} gold.`);
        s.gold -= house.cost;
        s.vassals.push(houseId);
        s.vassalLoyalty = s.vassalLoyalty ?? {};
        s.vassalLoyalty[houseId] = VASSAL.startLoyalty;
        chronicle(
          s,
          "rise",
          `${house.name} swears fealty`,
          `They pledge tithe and service to your banner — sworn to a lord, not a crown. ${house.power.toLocaleString()} swords, ${house.tithe} gold an hour.`,
        );
        toast.success(`${house.name} is sworn to you.`);
      }),

    /** Release a vassal from their oath. */
    releaseVassal: (houseId: string) =>
      update((s) => {
        if (!s.vassals?.includes(houseId)) return;
        s.vassals = s.vassals.filter((id) => id !== houseId);
        if (s.vassalLoyalty) delete s.vassalLoyalty[houseId];
        pushLog(
          s,
          `${VASSAL_BY_ID[houseId]?.name ?? "A house"} is released from their oath.`,
          "info",
        );
      }),

    /** Reaffirm a wavering house's oath with a gift of gold (§8.1). */
    reaffirmVassal: (houseId: string) =>
      update((s) => {
        const house = VASSAL_BY_ID[houseId];
        if (!house || !s.vassals?.includes(houseId)) return;
        const cost = reaffirmCost(house);
        if (s.gold < cost)
          return void toast.error(
            `${house.name} expects a gift of ${cost} gold to renew their faith.`,
          );
        s.gold -= cost;
        s.vassalLoyalty = s.vassalLoyalty ?? {};
        s.vassalLoyalty[houseId] = 100;
        pushLog(
          s,
          `A gift of ${cost} gold renews ${house.name}'s oath. Their loyalty stands full.`,
          "good",
        );
        toast.success(`${house.name}'s loyalty restored.`);
      }),

    /** Borrow gold from the Gilded Compact's Ledger (§6.3), owed back with interest. */
    takeLoan: (amount: number) =>
      update((s) => {
        if (s.loan) return void toast("The Compact will not lend twice. Settle the ledger first.");
        const amt = Math.max(100, Math.min(loanCeiling(s), Math.round(amount)));
        s.gold += amt;
        s.loan = {
          principal: amt,
          owed: Math.round(amt * (1 + LEDGER.rate)),
          dueAt: Date.now() + LEDGER.termMs,
        };
        chronicle(
          s,
          "rise",
          "A debt to the Compact",
          `The Ledger advances ${amt} gold against the clan's name. ${Math.round(amt * (1 + LEDGER.rate))} comes due within the week — every crown has a price.`,
        );
        toast.success(
          `Borrowed ${amt} gold. ${Math.round(amt * (1 + LEDGER.rate))} owed by week's end.`,
        );
      }),

    /** Settle the Compact debt — in full if you can afford it. */
    repayLoan: () =>
      update((s) => {
        if (!s.loan) return void toast("The ledger is clear.");
        if (s.gold < s.loan.owed)
          return void toast.error(`The Compact wants ${s.loan.owed} gold; you hold ${s.gold}.`);
        s.gold -= s.loan.owed;
        pushLog(s, `Settled the Compact ledger — ${s.loan.owed} gold. The debt is closed.`, "good");
        toast.success("The ledger is clear.");
        s.loan = undefined;
      }),

    /** Buy a term of Compact kit-insurance (§4.3, §6.3): a covered fall pays out. */
    buyInsurance: () =>
      update((s) => {
        const now = Date.now();
        if (insured(s, now))
          return void toast("A policy is already in force. The Compact will not double-write it.");
        const premium = insurePremium(s);
        if (s.gold < premium)
          return void toast.error(`The Compact asks ${premium} gold to underwrite the host.`);
        s.gold -= premium;
        s.insurance = { until: now + LEDGER.insureTermMs, premium };
        pushLog(
          s,
          `The Compact underwrites the host — ${premium} gold. A covered fall now pays out.`,
          "good",
        );
        toast.success("Host insured. The Ledger bears the risk now.");
      }),

    /** Place a bounty on a rival's head through the Ledger (§6.3). */
    placeBounty: (rivalId: string, amount: number) =>
      update((s) => {
        const r = s.rivals?.find((x) => x.id === rivalId);
        if (!r) return;
        const name = RIVAL_BY_ID[rivalId]?.name ?? "the rival";
        const stake = Math.max(LEDGER.bountyMin, Math.round(amount));
        if (s.gold < stake) return void toast.error(`You need ${stake} gold to post that bounty.`);
        s.gold -= stake;
        const net = Math.round(stake * (1 - LEDGER.bountyCut));
        s.bounties = s.bounties ?? {};
        s.bounties[rivalId] = (s.bounties[rivalId] ?? 0) + net;
        pushLog(
          s,
          `A bounty is posted on ${name} — ${net} gold escrowed with the Compact (${stake - net} taken as their cut).`,
          "info",
        );
        toast.success(`Bounty on ${name}: ${net} gold on their head.`);
      }),

    /** Refine the raw-Ash hoard into stable gold before it burns off (§6.2). */
    refineAsh: () =>
      update((s) => {
        const raw = Math.floor(s.rawAsh ?? 0);
        if (raw <= 0) return void toast("No raw Ash to refine.");
        const gold = refineAshValue(s);
        s.rawAsh = 0;
        s.gold += gold;
        pushLog(s, `Refined ${raw} raw Ash into ${gold} gold before it could burn off.`, "good");
        toast.success(`Refined ${raw} Ash → ${gold} gold.`);
      }),

    /** Rest the host at a warded flame — the only place Ash Debt clears (§1.1, §3.1). */
    restAtFlame: () =>
      update((s) => {
        const debt = s.ashDebt ?? 0;
        if (debt <= 0) return void toast("The host carries no Ash Debt.");
        const cost = restAtFlameCost(s);
        if (s.gold < cost) return void toast.error(`The rite of rest asks ${cost} gold.`);
        s.gold -= cost;
        s.ashDebt = 0;
        pushLog(
          s,
          `The host rested at the warded flame — Ash Debt cleared (${cost} gold).`,
          "good",
        );
        toast.success("Ash Debt cleared. The host stands at full strength.");
      }),

    /** Pray at the shrine: for the rest of the day, no champion falls in the boss fight. */
    prayForBlessing: () =>
      update((s) => {
        const today = dayKey();
        if (s.bossBlessing?.day === today) return void toast("The blessing already holds today.");
        const cost = blessingCost(s.clanLevel);
        if (s.gold < cost) return void toast.error(`The shrine asks ${cost} gold for the rite.`);
        s.gold -= cost;
        s.bossBlessing = { day: today };
        pushLog(
          s,
          `Prayed at the shrine — the host is warded against death today (${cost} gold).`,
          "good",
        );
        toast.success("A blessing shields your champions in the fight today.");
      }),

    /** Claim a felled boss's spoils, once, scaled by this clan's share and rank. */
    claimBossReward: (
      eventId: string,
      bossName: string,
      level: number,
      damageShare: number,
      rank: number,
    ) =>
      update((s) => {
        if (s.bossClaims?.[eventId]) return;
        const sp = bossSpoils(level, damageShare, rank);
        s.gold += sp.gold;
        s.reputation += sp.reputation;
        s.inspiration = (s.inspiration ?? 0) + sp.inspiration;
        // raw Ash pours off a felled boss — spend or refine it before it burns (§6.2)
        s.rawAsh = (s.rawAsh ?? 0) + Math.max(10, Math.round(level * damageShare * 3));
        s.bossClaims = { ...(s.bossClaims ?? {}), [eventId]: true };
        // the crown counts world-terrors felled toward the King's bounties (§ Court)
        if (s.court) s.court.stats.bossKills += 1;

        // The beast's hoard — themed loot on top of gold/rep.
        const loot = rollBossLoot(level, damageShare, rank);
        for (const l of loot) s.inventory[l.item] = (s.inventory[l.item] ?? 0) + l.qty;
        const lootText = loot
          .map((l) => `${ITEM_BY_ID[l.item]?.name ?? l.item}${l.qty > 1 ? ` ×${l.qty}` : ""}`)
          .join(", ");
        if (loot.length) {
          s.spoils = [
            ...loot.map((l) => ({
              id: uid(),
              at: Date.now(),
              item: l.item,
              qty: l.qty,
              rarity: spoilRarity(l.item),
              zone: bossName,
              party: "the realm",
            })),
            ...(s.spoils ?? []),
          ].slice(0, 40);
        }

        chronicle(
          s,
          "triumph",
          `${bossName} felled`,
          `The realm brought down ${bossName}. Our banners claimed ${sp.gold} gold, ${sp.reputation} reputation${lootText ? `, and the beast's hoard: ${lootText}` : ""} for our part in the kill.`,
        );
        pushLog(
          s,
          `${bossName} felled — claimed ${sp.gold} gold, ${sp.reputation} reputation${lootText ? `, ${lootText}` : ""}.`,
          "good",
        );
        toast.success(`${bossName} felled — spoils claimed`);
      }),

    /* ------------------------- identity & remembrance ------------------------ */

    setCrest: (crest: Crest, motto?: string) =>
      update((s) => {
        s.crest = crest;
        if (motto !== undefined) s.motto = motto;
        toast.success("The heralds have redrawn your arms.");
      }),

    setPortrait: (memberId: string, portrait: Portrait) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        m.portrait = portrait;
      }),

    renameMember: (memberId: string, name: string) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        const clean = name.trim().slice(0, 28);
        if (!m || !clean) return;
        const was = m.name;
        m.name = clean;
        if (m.isLord) s.leaderName = clean;
        pushLog(s, `${was} now answers to ${clean}.`, "info");
      }),

    /* ------------------------------ the realm -------------------------------- */

    /** Break a rival's claim on a hunting ground with a pitched battle. */
    contestRival: (rivalId: string, zoneId: string) =>
      update((s) => {
        const r = s.rivals?.find((x) => x.id === rivalId);
        const zone = ZONE_BY_ID[zoneId];
        if (!r || !zone) return;
        const host = clanHostPower(s);
        if (host <= 0) return void toast.error("You have no one to send.");
        const res = resolveClash(host, r.power);
        const name = RIVAL_BY_ID[rivalId]!.name;
        // blood is paid either way
        const roster = s.members.filter((m) => !m.isLord);
        for (const m of roster) {
          if (Math.random() >= res.casualtyRisk / 3) continue;
          m.hp = Math.max(1, Math.round(m.hp * 0.35));
          if (Math.random() < 0.22) {
            s.members = s.members.filter((x) => x.id !== m.id);
            for (const pp of s.parties) pp.memberIds = pp.memberIds.filter((x) => x !== m.id);
            s.memorial = s.memorial ?? [];
            s.memorial.unshift({
              id: m.id,
              name: m.name,
              classId: m.classId,
              level: m.level,
              at: Date.now(),
              where: `the field at ${zone.name}`,
              mobKills: m.mobKills ?? 0,
              oath: m.oath,
            });
            pushLog(s, `${m.name} was killed fighting ${name}.`, "bad");
            if (insured(s, Date.now())) {
              const payout = insurePayout(m.level);
              s.gold += payout;
              pushLog(s, `The Compact paid out ${payout} gold on ${m.name}'s policy.`, "good");
            }
          }
        }
        if (res.win) {
          r.claims = r.claims.filter((z) => z !== zoneId);
          r.power = Math.round(r.power * 0.82);
          r.routed += 1;
          r.hostility = Math.min(100, r.hostility + 12);
          s.reputation += 60;
          pushLog(s, `${name} was driven off ${zone.name}. The ground is yours.`, "good");
          chronicle(
            s,
            "war",
            `${zone.name} taken from ${name}`,
            `Their tax collectors were sent home without their banners. +60 reputation.`,
          );
          toast.success(`${zone.name} is free of ${name}.`);
          // a bounty on this rival's head clears through the Ledger (§6.3)
          const bounty = bountyOn(s, rivalId);
          if (bounty > 0 && s.bounties) {
            const repBonus = Math.round((bounty / 100) * LEDGER.bountyRepPer100);
            s.gold += bounty;
            s.reputation += repBonus;
            delete s.bounties[rivalId];
            pushLog(
              s,
              `The Compact settles the bounty on ${name} — ${bounty} gold and +${repBonus} standing.`,
              "good",
            );
            toast.success(`Bounty claimed: ${bounty} gold, +${repBonus} rep.`);
          }
        } else {
          r.hostility = Math.min(100, r.hostility + 18);
          s.reputation = Math.max(0, s.reputation - 25);
          pushLog(s, `Your host broke against ${name} at ${zone.name}.`, "bad");
          chronicle(
            s,
            "loss",
            `Repulsed at ${zone.name}`,
            `${name} held the line. The clan came home lighter than it left.`,
          );
          toast.error(`Defeated by ${name}.`);
        }
      }),

    /** Declare the castle's Vulnerability Window (§2.3) — the hours it can be
     * stormed. null clears it (open at any hour). */
    setCastleWindow: (startHour: number | null, hours: number) =>
      update((s) => {
        if (!s.castle || s.castle.holder !== "player")
          return void toast("You hold no seat to ward.");
        if (startHour === null) {
          s.castle.window = undefined;
          toast("Vareth now stands open to assault at any hour.");
          return;
        }
        const sh = Math.max(0, Math.min(23, Math.round(startHour)));
        const h = Math.max(2, Math.min(8, Math.round(hours)));
        s.castle.window = { startHour: sh, hours: h };
        toast.success(`Vulnerability window set — ${sh}:00 to ${(sh + h) % 24}:00.`);
      }),

    /** Declare and resolve a siege of Castle Vareth. */
    besiegeCastle: () =>
      update((s) => {
        const gate = siegeReady(s);
        if (!gate.ok) return void toast.error(gate.why);
        s.castle = s.castle ?? initialCastle();
        const defense = garrisonPower(s.castle, s.rivals ?? []);
        const host = clanHostPower(s);
        const res = resolveClash(host, defense);
        const holderName = s.castle.holder
          ? (RIVAL_BY_ID[s.castle.holder]?.name ?? "the crown garrison")
          : "the crown garrison";
        for (const m of s.members.filter((x) => !x.isLord)) {
          if (Math.random() >= res.casualtyRisk) continue;
          if (Math.random() < 0.3) {
            s.members = s.members.filter((x) => x.id !== m.id);
            for (const pp of s.parties) pp.memberIds = pp.memberIds.filter((x) => x !== m.id);
            s.memorial = s.memorial ?? [];
            s.memorial.unshift({
              id: m.id,
              name: m.name,
              classId: m.classId,
              level: m.level,
              at: Date.now(),
              where: "the walls of Vareth",
              mobKills: m.mobKills ?? 0,
              oath: m.oath,
            });
            pushLog(s, `${m.name} died on the walls of Vareth.`, "bad");
          } else {
            m.hp = Math.max(1, Math.round(m.hp * 0.3));
          }
        }
        if (res.win) {
          s.castle.holder = "player";
          s.castle.sinceAt = Date.now();
          s.castle.purse = 0;
          s.castle.lastTickAt = Date.now();
          s.castle.nextAssaultAt = Date.now() + 25 * 60_000;
          s.reputation += 250;
          const lord = lordOf(s);
          if (lord) lord.title = "Lord of Vareth";
          pushLog(s, `Vareth is taken. ${s.clanName} holds the trade road.`, "good");
          chronicle(
            s,
            "triumph",
            "Vareth is taken",
            `The gate came down at dusk and ${holderName} surrendered the keep. The tax road belongs to ${s.clanName}.`,
          );
          toast.success("Vareth is yours.");
        } else {
          s.reputation = Math.max(0, s.reputation - 80);
          pushLog(s, `The siege of Vareth failed. ${holderName} still holds the gate.`, "bad");
          chronicle(
            s,
            "loss",
            "The siege fails",
            `${holderName} held Vareth. The ladders are still lying in the ditch.`,
          );
          toast.error("The siege failed.");
        }
      }),

    collectTax: () =>
      update((s) => {
        if (!s.castle || s.castle.holder !== "player" || s.castle.purse <= 0)
          return void toast.error("There is nothing in the strongbox.");
        const purse = Math.round(s.castle.purse);
        s.gold += purse;
        s.castle.purse = 0;
        pushLog(s, `Collected ${purse.toLocaleString()} gold in road tax from Vareth.`, "good");
        toast.success(`+${purse.toLocaleString()} gold`);
      }),

    /** swear the company to an existing clan instead of founding your own */
    joinClan: (clanId: string) =>
      update((s) => {
        const def = RIVAL_BY_ID[clanId];
        if (!def) return;
        const check = canJoinClan(s);
        if (!check.ok) return void toast.error(check.why);
        s.reputation -= JOIN_REQ.rep;
        s.gold += JOIN_REQ.stipend;
        s.allegiance = {
          clanId: def.id,
          clanName: def.name,
          rank: "Sworn Captain",
          joinedAt: Date.now(),
        };
        const rival = s.rivals?.find((r) => r.id === def.id);
        if (rival) rival.hostility = 0;
        pushLog(
          s,
          `${s.leaderName} swore the company to ${def.name}. A 500 gold stipend and a second banner come with the oath.`,
          "good",
        );
        chronicle(
          s,
          "founding",
          `Sworn to ${def.name}`,
          `Rather than raise a crest of their own, ${s.leaderName} took service under ${def.name} as Sworn Captain.`,
        );
        toast.success(`Sworn to ${def.name}`);
      }),

    /** break the oath and go back to being a free company */
    leaveClan: () =>
      update((s) => {
        if (!s.allegiance) return void toast.error("You serve no clan.");
        const { clanName: name, clanId } = s.allegiance;
        s.allegiance = null;
        const rival = s.rivals?.find((r) => r.id === clanId);
        if (rival) rival.hostility = Math.min(100, rival.hostility + 25);
        while (s.parties.length > maxParties(s.clanLevel)) {
          const dropped = s.parties.pop();
          if (!dropped) break;
          for (const id of dropped.memberIds) {
            const m = s.members.find((x) => x.id === id);
            if (m) m.partyId = null;
          }
        }
        pushLog(s, `The company broke its oath to ${name}.`, "bad");
        toast(`No longer sworn to ${name}`);
      }),

    levelUpClan: () =>
      update((s) => {
        const req = nextClanReq(s.clanLevel);
        if (!req) return void toast.error("Your clan already stands at its peak.");
        if (s.reputation < req.rep || s.gold < req.gold)
          return void toast.error("Not enough reputation or gold.");
        if (req.level === 1 && s.allegiance) {
          pushLog(s, `The company left ${s.allegiance.clanName} to raise its own crest.`, "info");
          s.allegiance = null;
        }
        s.reputation -= req.rep;
        s.gold -= req.gold;
        s.clanLevel = req.level;
        if (req.level === 1) {
          pushLog(s, `${s.clanName} is founded. The crest flies at last.`, "good");
          chronicle(
            s,
            "founding",
            `${s.clanName} is founded`,
            `What began as one company is now a clan. ${s.members.length} blades stand under the crest.`,
          );
          toast.success(`${s.clanName} is founded!`);
        } else {
          pushLog(s, `The clan rose to level ${req.level}. New banner slot unlocked.`, "good");
          chronicle(
            s,
            "rise",
            `${s.clanName} rises to level ${req.level}`,
            `Another banner may take the field. ${s.members.length} sworn stand under the crest.`,
          );
          toast.success(`Clan level ${req.level}!`);
        }
      }),

    craft: (recipeId: string) =>
      update((s) => {
        const r = recipeById(s, recipeId);
        if (!r) return;
        const check = canCraft(s, recipeId);
        if (!check.ok) return void toast.error(check.why);
        const chance = craftChance(s, recipeId);
        s.gold -= forgeFee(s, r.gold);
        for (const i of r.inputs) s.inventory[i.item] = (s.inventory[i.item] ?? 0) - i.qty;
        const name = ITEM_BY_ID[r.result]?.name;
        if (Math.random() < chance) {
          const quality = rollQuality(qualityStepChance(s, recipeId));
          const made = qualityItemId(r.result, quality);
          const madeName = ITEM_BY_ID[made]?.name ?? name;
          s.inventory[made] = (s.inventory[made] ?? 0) + (r.qty ?? 1);
          pushLog(
            s,
            quality > 0
              ? `Forged ${madeName} — ${qualityLabel(quality)} quality ${quality}/${MAX_QUALITY}.`
              : `Forged ${madeName}.`,
            "good",
          );
          toast.success(
            quality > 0 ? `Forged ${madeName} (quality ${quality})` : `Forged ${madeName}`,
          );
          if (quality >= 12) {
            chronicle(
              s,
              "forge",
              `${madeName} leaves the forge`,
              quality > 0
                ? `Quality ${quality}/${MAX_QUALITY}. The smiths will be talking about this one for a while.`
                : "A piece worth writing down.",
            );
          }
        } else if ((s.inspiration ?? 0) > 0) {
          // Inspiration lets the smiths take the check again
          s.inspiration = (s.inspiration ?? 0) - 1;
          if (Math.random() < chance) {
            const quality = rollQuality(qualityStepChance(s, recipeId));
            const made = qualityItemId(r.result, quality);
            const madeName = ITEM_BY_ID[made]?.name ?? name;
            s.inventory[made] = (s.inventory[made] ?? 0) + (r.qty ?? 1);
            pushLog(s, `Inspiration spent — the second attempt held. Forged ${madeName}.`, "good");
            toast.success(`Inspired reforge: ${madeName}`);
          } else {
            pushLog(s, `Inspiration spent, and still the ${name} shattered.`, "bad");
            toast.error(`Craft failed twice: ${name}`);
          }
        } else {
          pushLog(s, `The forge failed — ${name} shattered, materials lost.`, "bad");
          toast.error(`Craft failed: ${name}`);
        }
      }),

    /**
     * Sharpen a quality-graded piece one step higher — a gamble fed by farmed
     * essence. Below the safe threshold a miss is harmless; above it a miss grinds
     * the edge back a step unless the strike is warded with extra gold.
     */
    sharpen: (item: ItemId, ward = false) =>
      update((s) => {
        const check = canSharpen(s, item, ward);
        if (!check.ok) return void toast.error(check.why);
        const { base, quality } = splitItemId(item);
        const c = sharpenCost(item, quality);
        const wardGold = ward ? sharpenWardCost(item, quality) : 0;
        const def = ITEM_BY_ID[base];
        // pay the strike up front
        s.inventory[item] = (s.inventory[item] ?? 0) - 1;
        s.inventory[emberId(c.kind)] = (s.inventory[emberId(c.kind)] ?? 0) - c.ember;
        s.gold -= c.gold + wardGold;
        if (Math.random() < sharpenChance(quality)) {
          const up = qualityItemId(base, quality + 1);
          const upName = ITEM_BY_ID[up]?.name ?? def?.name;
          s.inventory[up] = (s.inventory[up] ?? 0) + 1;
          pushLog(s, `Sharpened ${upName} — the edge held at +${quality + 1}.`, "good");
          toast.success(`Sharpened to +${quality + 1}`);
          if (quality + 1 >= 12) {
            chronicle(
              s,
              "forge",
              `${upName} takes a keener edge`,
              `Sharpened to +${quality + 1}/${MAX_QUALITY}. Few hands ever push a piece this far.`,
            );
          }
        } else if (quality <= SHARPEN_SAFE || ward) {
          // harmless bounce — the piece survives at its current edge
          s.inventory[item] = (s.inventory[item] ?? 0) + 1;
          if (ward) {
            pushLog(
              s,
              `The ward held — ${def?.name} survived a failed strike at +${quality}.`,
              "info",
            );
            toast(`Ward held — +${quality} kept`);
          } else {
            pushLog(s, `The strike slipped, but +${quality} ${def?.name} took no harm.`, "info");
            toast(`Failed — +${quality} unharmed`);
          }
        } else {
          const down = qualityItemId(base, quality - 1);
          const downName = ITEM_BY_ID[down]?.name ?? def?.name;
          s.inventory[down] = (s.inventory[down] ?? 0) + 1;
          pushLog(s, `The temper cracked — ${def?.name} ground back to +${quality - 1}.`, "bad");
          toast.error(`Failed — dropped to +${quality - 1}`);
        }
      }),

    /**
     * Public town forge — no artisans required, heavier fee, and a success is
     * always a standard piece (quality 0). Predictable by design.
     */
    systemForge: (recipeId: string, times = 1) =>
      update((s) => {
        const r = recipeById(s, recipeId);
        if (!r) return;
        const name = ITEM_BY_ID[r.result]?.name ?? "the piece";
        let made = 0;
        let lost = 0;
        let attempts = 0;
        let goldSpent = 0;
        for (let i = 0; i < Math.max(1, times); i++) {
          const check = canSystemForge(s, recipeId);
          if (!check.ok) {
            if (i === 0) toast.error(check.why);
            break;
          }
          const fee = systemForgeFee(s, recipeId);
          s.gold -= fee;
          goldSpent += fee;
          attempts++;
          for (const inp of r.inputs)
            s.inventory[inp.item] = (s.inventory[inp.item] ?? 0) - inp.qty;
          if (Math.random() < systemForgeChance(s, recipeId)) {
            s.inventory[r.result] = (s.inventory[r.result] ?? 0) + (r.qty ?? 1);
            made += r.qty ?? 1;
          } else {
            lost++;
          }
        }
        if (attempts > 0) {
          const entry = {
            id: uid(),
            at: Date.now(),
            recipeId,
            result: r.result,
            attempts,
            successes: attempts - lost,
            produced: made,
            goldSpent,
            chance: systemForgeChance(s, recipeId),
            inputs: r.inputs.map((inp) => ({ item: inp.item, qty: inp.qty * attempts })),
          };
          s.forgeHistory = [entry, ...(s.forgeHistory ?? [])].slice(0, 80);
        }
        if (made > 0) {
          pushLog(s, `System Forge: ${made} × ${name} struck to standard pattern.`, "good");
          toast.success(`Forged ${made} × ${name} (standard)`);
        }
        if (lost > 0) {
          pushLog(s, `System Forge: ${lost} attempt(s) failed — materials lost.`, "bad");
          if (made === 0) toast.error(`Forge failed: ${name}`);
        }
      }),

    equip: (memberId: string, item: ItemId) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        const def = ITEM_BY_ID[item];
        if (!m || !def) return;
        if ((s.inventory[item] ?? 0) < 1) return;
        const slot = slotOf(item);
        if (!slot) return void toast.error("That cannot be worn.");
        if (m.gear.some((g) => slotOf(g) === slot))
          return void toast.error(`${m.name} already has a ${slot} equipped.`);
        if (m.level < (def.reqLevel ?? 1))
          return void toast.error(`${def.name} needs level ${def.reqLevel}.`);
        s.inventory[item] = (s.inventory[item] ?? 0) - 1;
        m.gear.push(item);
      }),

    unequip: (memberId: string, index: number) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        const [it] = m.gear.splice(index, 1);
        if (it) s.inventory[it] = (s.inventory[it] ?? 0) + 1;
        // an engraved rune is bound to the blade — it's ground away with it
        if (it && slotOf(it) === "weapon" && m.weaponRune) delete m.weaponRune;
      }),

    /**
     * Engrave a weapon rune onto a champion, consuming it. Every strike they land
     * then deals that damage type — the lever that lets a banner exploit a zone's
     * weakness. Re-engraving overwrites the old rune; unequipping the weapon loses it.
     */
    socketRune: (memberId: string, type: RuneType) =>
      update((s) => {
        const check = canSocketRune(s, memberId, type);
        if (!check.ok) return void toast.error(check.why);
        const m = s.members.find((x) => x.id === memberId)!;
        s.inventory[RUNE_ITEM[type]] = (s.inventory[RUNE_ITEM[type]] ?? 0) - 1;
        m.weaponRune = type;
        pushLog(
          s,
          `${m.name}'s weapon is engraved — strikes now deal ${DAMAGE_LABEL[type]}.`,
          "good",
        );
        toast.success(`${m.name}: ${DAMAGE_LABEL[type]} rune engraved`);
      }),

    clearRune: (memberId: string) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m || !m.weaponRune) return;
        const was = m.weaponRune;
        delete m.weaponRune;
        pushLog(s, `${m.name}'s ${DAMAGE_LABEL[was]} rune is ground away.`, "info");
      }),

    sell: (item: ItemId) =>
      update((s) => {
        const have = s.inventory[item] ?? 0;
        if (have < 1) return;
        s.inventory[item] = have - 1;
        // the living market breathes: today's index moves what a sale fetches, and
        // a merchant passing through the square pays a little over the odds
        const dayIdx = Math.floor(Date.now() / 86400000);
        const idx = marketIndex(dayIdx);
        const merchant = travelingMerchant(dayIdx);
        const bonus = merchant ? 1 + merchant.discount * 0.5 : 1;
        s.gold += Math.round(
          (ITEM_BY_ID[item]?.value ?? 0) * keepEffects(s).sellMult * idx * bonus,
        );
      }),

    /* ------------------------------- market ------------------------------- */

    toggleShots: () =>
      update((s) => {
        s.shotsEnabled = s.shotsEnabled === false;
        pushLog(
          s,
          s.shotsEnabled
            ? "Banners will load shots before every strike."
            : "Shots holstered — banners fight bare.",
          "info",
        );
      }),

    toggleMemberShots: (memberId: string) =>
      update((s) => {
        const m = s.members.find((x) => x.id === memberId);
        if (!m) return;
        m.shotsOn = m.shotsOn === false;
        pushLog(
          s,
          m.shotsOn
            ? `${m.name} will load shots before every strike.`
            : `${m.name} holsters their shots.`,
          "info",
        );
      }),

    refineShots: (kind: ShotKind, grade: Grade, blessed: boolean, batches = 1) =>
      update((s) => {
        const check = canRefine(s, kind, grade, blessed, batches);
        if (!check.ok) return void toast.error(check.why);
        const c = shotBatchCost(grade, blessed);
        s.inventory[emberId(kind)] = (s.inventory[emberId(kind)] ?? 0) - c.embers * batches;
        s.gold -= c.fee * batches;
        const id = shotId(kind, grade, blessed);
        const made = c.qty * batches;
        s.inventory[id] = (s.inventory[id] ?? 0) + made;
        pushLog(s, `The market pressed ${made} × ${ITEM_BY_ID[id]?.name}.`, "good");
        toast.success(`+${made} ${ITEM_BY_ID[id]?.name}`);
      }),

    /* ------------------------------ scriptorium ------------------------------ */

    /** Bind a spell into vellum. WIT rules the weave, MEN rules the recoil. */
    imprintScroll: (memberId: string, scrollId: string, tries = 1) =>
      update((s) => {
        const def = SCROLL_BY_ID[scrollId];
        if (!def) return;
        let made = 0;
        let fizzles = 0;
        let backfires = 0;
        let last = "";
        for (let i = 0; i < tries; i++) {
          const check = canImprint(s, memberId, scrollId);
          if (!check.ok) {
            if (i === 0) return void toast.error(check.why);
            last = check.why;
            break;
          }
          const m = s.members.find((x) => x.id === memberId)!;
          const st = memberStats(m);
          const hpBefore = Math.round(m.hp);
          const mpBefore = Math.round(m.mp);
          const stockBefore = s.inventory[def.id] ?? 0;
          // the ink, the vellum and the caster's own strength are spent regardless
          for (const inp of def.inputs) {
            s.inventory[inp.item] = (s.inventory[inp.item] ?? 0) - inp.qty;
          }
          s.gold -= def.gold;
          m.mp = Math.max(0, m.mp - def.mp);

          const detail = rollOutcomeDetail(scribeOdds(m, def), st.wit, st.men);
          const outcome = detail.outcome;
          let yielded = 0;
          let note = "";
          if (outcome === "improved") {
            yielded = IMPROVED_YIELD;
            note = `${m.name} bound ${def.name} flawlessly — two scrolls from one weave.`;
            pushLog(s, note, "good");
          } else if (outcome === "success") {
            yielded = 1;
            note = `${m.name} bound ${def.name}.`;
          } else if (outcome === "fizzle") {
            fizzles += 1;
            note = `${m.name} ruined the vellum — ${def.name} never took hold.`;
          } else {
            backfires += 1;
            m.hp = Math.max(1, Math.round(m.hp - maxHp(m) * 0.22));
            m.mp = Math.max(0, Math.round(m.mp - maxMp(m) * 0.15));
            note = `${def.name} backfired on ${m.name} — the sigil burned inward.`;
            pushLog(s, note, "bad");
          }
          made += yielded;
          if (yielded > 0) s.inventory[def.id] = stockBefore + yielded;

          s.scrollLog = [
            ...(s.scrollLog ?? []),
            {
              id: attemptId(),
              at: Date.now(),
              memberId: m.id,
              memberName: m.name,
              scrollId: def.id,
              scrollName: def.name,
              phase: "imprint" as const,
              detail,
              cost: {
                gold: def.gold,
                mp: def.mp,
                inputs: def.inputs.map((i) => ({ item: i.item as string, qty: i.qty })),
              },
              hpBefore,
              hpAfter: Math.round(m.hp),
              maxHp: Math.round(maxHp(m)),
              mpBefore,
              mpAfter: Math.round(m.mp),
              maxMp: Math.round(maxMp(m)),
              stockBefore,
              stockAfter: stockBefore + yielded,
              note,
            },
          ].slice(-SCROLL_LOG_CAP);
        }

        const parts = [
          made ? `+${made} ${def.name}` : null,
          fizzles ? `${fizzles} ruined` : null,
          backfires ? `${backfires} backfired` : null,
        ].filter(Boolean);
        if (made > 0) toast.success(parts.join(" · "));
        else if (parts.length) toast.error(parts.join(" · "));
        if (last) toast.message(last);
      }),

    toggleScrolls: () =>
      update((s) => {
        s.scrollsEnabled = s.scrollsEnabled === false;
        pushLog(
          s,
          s.scrollsEnabled
            ? "Banners will carry scrolls into the field."
            : "Scrolls stay locked in the warehouse.",
          "info",
        );
      }),

    /* ------------------------------ clan keep ------------------------------ */

    upgradeKeep: (id: KeepBuildingId) =>
      update((s) => {
        const b = KEEP_BY_ID[id];
        if (!b) return;
        const check = canUpgradeKeep(s, id);
        if (!check.ok) return void toast.error(check.why);
        const lvl = keepLevel(s, id);
        const cost = keepUpgradeCost(b, lvl);
        s.gold -= cost.gold;
        s.reputation -= cost.rep;
        s.keep = { ...(s.keep ?? {}), [id]: lvl + 1 };
        pushLog(s, `The ${b.name} was raised to level ${lvl + 1}.`, "good");
        toast.success(`${b.name} — level ${lvl + 1}`);
      }),

    /** infirmary: pay the surgeons to put everyone resting back to full health */
    tendWounded: () =>
      update((s) => {
        if (keepLevel(s, "infirmary") < 1) return void toast.error("Build the Infirmary first.");
        const bill = mendBill(s);
        if (!bill.patients.length) return void toast.error("Nobody needs tending.");
        if (s.gold < bill.gold) return void toast.error("Not enough gold for the surgeons.");
        s.gold -= bill.gold;
        for (const p of bill.patients) {
          const m = s.members.find((x) => x.id === p.id);
          if (!m) continue;
          m.hp = maxHp(m);
          m.mp = maxMp(m);
        }
        pushLog(
          s,
          `The infirmary patched up ${bill.patients.length} champion(s) for ${bill.gold} gold.`,
          "good",
        );
        toast.success(`${bill.patients.length} champions mended`);
      }),

    /** training yard: a paid drill session that pushes skill mastery */
    drill: () =>
      update((s) => {
        const eff = keepEffects(s);
        if (!eff.drillXp) return void toast.error("Build the Training Yard first.");
        if (s.gold < eff.drillCost) return void toast.error("Not enough gold for the drill.");
        const busy = new Set(s.parties.filter((p) => p.run).flatMap((p) => p.memberIds));
        const resting = s.members.filter((m) => !busy.has(m.id) && m.hp > 0 && m.skills.length);
        if (!resting.length) return void toast.error("No champions are resting at the keep.");
        s.gold -= eff.drillCost;
        for (const m of resting) {
          for (const sk of m.skills) {
            if (sk.level >= MAX_SKILL_LEVEL) continue;
            // flat yard xp early, a fixed slice of the (steep) next level late, so
            // drilling never becomes a rounding error against high-level mastery
            sk.xp += Math.max(eff.drillXp, Math.round(xpForSkillLevel(sk.level) * 0.03));
            while (sk.level < MAX_SKILL_LEVEL && sk.xp >= xpForSkillLevel(sk.level)) {
              sk.xp -= xpForSkillLevel(sk.level);
              sk.level += 1;
            }
          }
        }
        pushLog(s, `Drill session at the yard — ${resting.length} champion(s) trained.`, "good");
        toast.success(`${resting.length} champions drilled`);
      }),

    /* ------------------------------ Muster hall ------------------------------ */

    /** send heralds out to find party leaders willing to be courted */
    scoutCompanies: () =>
      update((s) => {
        const cost = prospectCost(s.clanLevel);
        if (s.gold < cost) return void toast.error("Not enough gold to send heralds.");
        s.gold -= cost;
        s.companies = [
          ...(s.companies ?? []).filter((c) => c.kind === "petition"),
          ...rollProspects(Math.max(1, s.clanLevel)),
        ];
        s.prospectsAt = Date.now();
        pushLog(s, "Heralds ride out looking for companies without a banner.", "info");
      }),

    /** take a whole free company into the clan, optionally as its own banner */
    acceptCompany: (companyId: string, keepTogether = true) =>
      update((s) => {
        const c = (s.companies ?? []).find((x) => x.id === companyId);
        if (!c) return;
        const check = canAcceptCompany(s, c);
        if (!check.ok) return void toast.error(check.why);

        s.gold -= c.ask;
        s.reputation += Math.round(companyPower(c) / 120);

        let partyId: string | null = null;
        if (keepTogether && s.parties.length < maxParties(s.clanLevel, !!s.allegiance)) {
          partyId = uid();
          s.parties.push({ id: partyId, name: c.name, memberIds: [], run: null });
        }
        for (const m of c.members) {
          const joined = { ...m, partyId };
          s.members.push(joined);
          if (partyId) s.parties.find((p) => p.id === partyId)!.memberIds.push(joined.id);
        }
        s.companies = (s.companies ?? []).filter((x) => x.id !== companyId);
        pushLog(
          s,
          `${c.leaderName} brings ${c.members.length} blade(s) of ${c.name} under your crest.`,
          "good",
        );
        toast.success(`${c.name} joined${partyId ? " as their own banner" : ""}`);
      }),

    declineCompany: (companyId: string) =>
      update((s) => {
        const c = (s.companies ?? []).find((x) => x.id === companyId);
        if (!c) return;
        s.companies = (s.companies ?? []).filter((x) => x.id !== companyId);
        if (c.kind === "petition") {
          s.reputation = Math.max(0, s.reputation - 2);
          pushLog(s, `${c.leaderName} of ${c.name} was turned away at the gate.`, "bad");
        }
      }),
  };

  return { state, hydrated, api, CLAN_LEVELS } as {
    state: GameState | null;
    hydrated: boolean;
    api: typeof api;
    CLAN_LEVELS: typeof CLAN_LEVELS;
  };
}

export type ClanApi = ReturnType<typeof useClanGame>["api"];
export type { Member };
