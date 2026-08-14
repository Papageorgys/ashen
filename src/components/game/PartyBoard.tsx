import { useState } from "react";
import { cn } from "@/lib/utils";
import { DRAG_MEMBER } from "@/lib/game/dnd";
import { RealmAtlas } from "./RealmAtlas";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { CLASS_BY_ID, MAX_PARTY_SIZE, ZONES, travelMsTo, type Role } from "@/lib/game/data";
import {
  maxParties,
  memberPower,
  partyMembers,
  partyPower,
  partySynergies,
  synergyBonus,
  bondedPairsInParty,
  bondBonus,
  partyDamageTypes,
  zoneThreatProfile,
  DAMAGE_LABEL,
  STANCE_LABEL,
  STANCE_BLURB,
  type GameState,
  type Party,
  type Stance,
} from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

const ROLE_FILTERS: Role[] = [
  "guardian",
  "blade",
  "archer",
  "arcanist",
  "mender",
  "chanter",
  "artisan",
];

function PartyCard({
  state,
  api,
  party,
  now,
}: {
  state: GameState;
  api: ClanApi;
  party: Party;
  now: number;
}) {
  const zoneId = party.run?.zoneId ?? ZONES[0]!.id;
  const members = partyMembers(state, party);
  const power = partyPower(state, party);
  const zone = ZONES.find((z) => z.id === (party.run?.zoneId ?? zoneId))!;
  const remaining = party.run ? Math.max(0, party.run.endsAt - now) : 0;
  const pct = party.run ? 100 - (remaining / zone.durationMs) * 100 : 0;
  const travelZone = party.travel ? ZONES.find((z) => z.id === party.travel!.zoneId) : null;
  const travelRemaining = party.travel ? Math.max(0, party.travel.arrivesAt - now) : 0;
  const travelTotal = party.travel ? travelMsTo(party.travel.zoneId) : 1;
  const travelPct = party.travel ? 100 - (travelRemaining / travelTotal) * 100 : 0;
  const odds = Math.round(Math.max(8, Math.min(96, 15 + (power / zone.threat) * 60)));
  const synergies = partySynergies(state, party);
  const syn = synergyBonus(members);
  const bonds = bondedPairsInParty(state, party);
  const bondPct = Math.round(bondBonus(state, party) * 100);
  const [over, setOver] = useState(false);
  const full = members.length >= MAX_PARTY_SIZE;
  const dmgTypes = partyDamageTypes(members);
  const stance = party.stance ?? "steady";
  const targetZoneId = party.run?.zoneId ?? party.travel?.zoneId ?? party.farming ?? null;
  const targetProfile = targetZoneId ? zoneThreatProfile(targetZoneId) : null;
  const covers = targetProfile?.weak.some((t) => dmgTypes.includes(t)) ?? false;

  return (
    <div
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_MEMBER)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_MEMBER);
        if (!id) return;
        e.preventDefault();
        api.assign(id, party.id);
      }}
      className={cn(
        "panel rounded-sm p-3 transition-colors",
        over && !party.run && !full && "border-gold ring-2 ring-gold/50",
        over && (!!party.run || full) && "border-destructive ring-2 ring-destructive/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-display text-base">
          <input
            value={party.name}
            aria-label="Banner name"
            disabled={!!party.run}
            onChange={(e) => api.renameParty(party.id, e.target.value)}
            className="w-full min-w-0 max-w-[11rem] truncate rounded-sm border border-transparent bg-transparent px-1 font-display text-base outline-none hover:border-border focus:border-gold disabled:cursor-default"
          />
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {members.length}/{MAX_PARTY_SIZE}
          </span>
        </h3>
        <div className="flex items-center gap-1">
          <span className="font-display text-sm text-gold">{power} pwr</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                aria-label="Banner actions"
                title="Banner actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Banner actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!!party.run || full}
                onSelect={() => api.autoFillParty(party.id)}
              >
                Auto-draft missing roles
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!!party.run || members.length === 0}
                onSelect={() => api.clearParty(party.id)}
              >
                Clear the banner
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!party.farming}
                onSelect={() => api.recallParty(party.id)}
              >
                Recall from the field
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {members.map((m) => (
          <MemberCard
            key={m.id}
            member={m}
            state={state}
            api={api}
            compact
            right={
              <Button
                size="sm"
                variant="ghost"
                disabled={!!party.run}
                onClick={() => api.assign(m.id, null)}
              >
                ✕
              </Button>
            }
          />
        ))}
        {members.length === 0 && (
          <p className="text-xs text-muted-foreground">Empty banner — assign members below.</p>
        )}
      </div>

      {members.length > 0 && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Synergy</p>
          {synergies.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              No bonds yet — mix roles and races to spark them.
            </p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {synergies.map((s) => {
                const good = (s.bonus.power ?? 0) + (s.bonus.mitigation ?? 0) >= 0;
                return (
                  <span
                    key={s.id}
                    title={`${s.req} — ${s.desc}`}
                    className={
                      "rounded-sm border px-1.5 py-0.5 text-[10px] " +
                      (good
                        ? "border-gold/40 bg-gold/10 text-gold"
                        : "border-destructive/40 bg-destructive/10 text-destructive")
                    }
                  >
                    {s.name}
                  </span>
                );
              })}
            </div>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            {[
              syn.power ? `${syn.power > 0 ? "+" : ""}${syn.power}% power` : null,
              syn.mitigation ? `${syn.mitigation > 0 ? "+" : ""}${syn.mitigation}% defence` : null,
              syn.find ? `+${syn.find} find` : null,
              syn.xp ? `+${syn.xp}% xp` : null,
              syn.gold ? `+${syn.gold}% gold` : null,
              syn.upkeep ? `${syn.upkeep > 0 ? "-" : "+"}${Math.abs(syn.upkeep)}% mp cost` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {bonds > 0 && (
            <p
              className="mt-1 text-[10px] text-grade-c"
              title="Champions fighting beside those they are shield-bonded to"
            >
              🛡 {bonds} shield-bond{bonds > 1 ? "s" : ""} riding together · +{bondPct}% power
            </p>
          )}
        </div>
      )}

      {/* battle plan: stance + what damage the banner brings, vs what the field is weak to */}
      <div className="mt-3 space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Stance
          </span>
          <div className="inline-flex overflow-hidden rounded-sm border border-border">
            {(["aggressive", "steady", "defensive"] as Stance[]).map((st) => (
              <button
                key={st}
                type="button"
                title={STANCE_BLURB[st]}
                onClick={() => api.setPartyStance(party.id, st)}
                className={cn(
                  "px-2 py-0.5 font-display text-[10px] uppercase tracking-wider transition-colors",
                  stance === st
                    ? "bg-gold/15 text-gold"
                    : "text-muted-foreground hover:text-gold/80",
                )}
              >
                {STANCE_LABEL[st]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[10px]">
          <span className="text-muted-foreground">Brings</span>
          {dmgTypes.length ? (
            dmgTypes.map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-sm border px-1.5 py-0.5",
                  targetProfile?.weak.includes(t)
                    ? "border-grade-a/60 text-grade-a"
                    : targetProfile?.resist.includes(t)
                      ? "border-destructive/50 text-destructive"
                      : "border-border text-gold",
                )}
              >
                {DAMAGE_LABEL[t]}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        {targetProfile && (targetProfile.weak.length > 0 || targetProfile.resist.length > 0) && (
          <p className="text-[10px] text-muted-foreground">
            This field is{" "}
            {targetProfile.weak.length > 0 && (
              <>
                weak to{" "}
                <span className="text-grade-a">
                  {targetProfile.weak.map((t) => DAMAGE_LABEL[t]).join(", ")}
                </span>
              </>
            )}
            {targetProfile.weak.length > 0 && targetProfile.resist.length > 0 && ", "}
            {targetProfile.resist.length > 0 && (
              <>
                resists{" "}
                <span className="text-destructive">
                  {targetProfile.resist.map((t) => DAMAGE_LABEL[t]).join(", ")}
                </span>
              </>
            )}
            .{targetProfile.weak.length > 0 && !covers && " Bring that damage."}
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {party.travel ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Marching to {travelZone?.name ?? "the field"} · on the road</span>
              <span>{(travelRemaining / 1000).toFixed(0)}s</span>
            </div>
            <Progress value={travelPct} />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => api.recallParty(party.id)}
            >
              Turn back
            </Button>
          </div>
        ) : party.run ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Farming {zone.name}
                {party.farming ? " · on loop" : " · returning after this run"}
              </span>
              <span>{(remaining / 1000).toFixed(0)}s</span>
            </div>
            <Progress value={pct} />
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!party.farming}
              onClick={() => api.recallParty(party.id)}
            >
              {party.farming ? "Recall banner" : "Recall ordered"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="italic">Awaiting orders — set its piece on the war table.</span>
            <span className="font-display text-gold">
              {odds}% at {zone.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PartyBoard({
  state,
  api,
  now,
  onOpenTool,
}: {
  state: GameState;
  api: ClanApi;
  now: number;
  onOpenTool?: (tab: string) => void;
}) {
  const unassigned = state.members.filter(
    (m) => !state.parties.some((p) => p.memberIds.includes(m.id)),
  );
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const openBanner = state.parties.find((p) => !p.run && p.memberIds.length < MAX_PARTY_SIZE);
  const openSeats = state.parties.reduce(
    (n, p) => n + (p.run ? 0 : MAX_PARTY_SIZE - p.memberIds.length),
    0,
  );

  const shown = unassigned
    .filter((m) => (roleFilter === "all" ? true : CLASS_BY_ID[m.classId]!.role === roleFilter))
    .filter((m) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const cls = CLASS_BY_ID[m.classId]!;
      return m.name.toLowerCase().includes(q) || cls.name.toLowerCase().includes(q);
    })
    .sort((a, b) => memberPower(b) - memberPower(a));

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg">War Table</h2>
          <p className="text-xs text-muted-foreground">
            {state.parties.length} / {maxParties(state.clanLevel, !!state.allegiance)} banners
            fielded · {unassigned.length} champion(s) idle · {openSeats} open seat(s).
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            disabled={state.parties.length >= maxParties(state.clanLevel, !!state.allegiance)}
            onClick={api.createParty}
          >
            Raise banner
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                aria-label="War table actions"
                title="War table actions"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>All banners</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={openSeats === 0 || unassigned.length === 0}
                onSelect={() => api.autoFillAll()}
              >
                Fill every banner
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!state.parties.some((p) => p.farming)}
                onSelect={() =>
                  state.parties.filter((p) => p.farming).forEach((p) => api.recallParty(p.id))
                }
              >
                Recall every banner
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <RealmAtlas state={state} api={api} now={now} {...(onOpenTool ? { onOpenTool } : {})} />

      <div className="grid gap-3 lg:grid-cols-2">
        {state.parties.map((p) => (
          <PartyCard key={p.id} state={state} api={api} party={p} now={now} />
        ))}
      </div>

      <div
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DRAG_MEMBER)) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(DRAG_MEMBER);
          if (!id) return;
          e.preventDefault();
          api.assign(id, null);
        }}
        className="rounded-sm border border-dashed border-border p-2"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="font-display text-sm text-muted-foreground">
            Roster ({shown.length}/{unassigned.length})
          </h3>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or class…"
            aria-label="Search idle champions"
            className="h-7 w-44 rounded-sm border border-border bg-background px-2 text-xs outline-none focus:border-gold"
          />
          <div className="flex flex-wrap gap-1">
            {(["all", ...ROLE_FILTERS] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "rounded-sm border px-1.5 py-0.5 text-[10px] capitalize",
                  roleFilter === r
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border text-muted-foreground hover:border-gold/50",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {shown.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              state={state}
              api={api}
              compact
              right={
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px]"
                    disabled={!openBanner}
                    title={openBanner ? `Send to ${openBanner.name}` : "No banner has a free seat"}
                    onClick={() => openBanner && api.assign(m.id, openBanner.id)}
                  >
                    Add
                  </Button>
                  <Select onValueChange={(v) => api.assign(m.id, v)}>
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue placeholder="Banner" />
                    </SelectTrigger>
                    <SelectContent>
                      {state.parties.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          disabled={!!p.run || p.memberIds.length >= MAX_PARTY_SIZE}
                        >
                          {p.name} ({p.memberIds.length}/{MAX_PARTY_SIZE})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => api.dismiss(m.id)}>
                    ✕
                  </Button>
                </div>
              }
            />
          ))}
          {shown.length === 0 && (
            <p className="text-xs text-muted-foreground">
              {unassigned.length === 0
                ? "Every sworn member stands in a banner."
                : "No idle champion matches that filter."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
