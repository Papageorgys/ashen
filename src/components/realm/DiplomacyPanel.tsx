import { useState } from "react";
import {
  getRelation,
  type Diplomacy,
  type DiploAction,
  type ProposalResult,
  type Stance,
} from "@/lib/realm/diplomacy";
import type { World } from "@/lib/realm/types";
import { GameIcon } from "@/components/game/GameIcon";

const STANCE_META: Record<Stance, { label: string; color: string }> = {
  peace: { label: "Peace", color: "#9aa0a6" },
  war: { label: "At War", color: "#d1603a" },
  nap: { label: "Non-Aggression", color: "#5fd0c6" },
  alliance: { label: "Allied", color: "#7ea86a" },
};

const ACTIONS: Record<Stance, { action: DiploAction; label: string }[]> = {
  peace: [
    { action: "alliance", label: "Propose alliance" },
    { action: "nap", label: "Propose pact" },
    { action: "tribute", label: "Send tribute" },
    { action: "threaten", label: "Threaten" },
    { action: "declare_war", label: "Declare war" },
  ],
  nap: [
    { action: "alliance", label: "Propose alliance" },
    { action: "tribute", label: "Send tribute" },
    { action: "declare_war", label: "Break pact — war" },
  ],
  war: [
    { action: "peace", label: "Sue for peace" },
    { action: "threaten", label: "Threaten" },
  ],
  alliance: [{ action: "tribute", label: "Send tribute" }],
};

/**
 * The Diplomacy chamber — treat with every rival crown. You act; the
 * simulation weighs it and the ruler answers.
 */
export function DiplomacyPanel({
  world,
  dip,
  treasury,
  evaluate,
  onClose,
}: {
  world: World;
  dip: Diplomacy;
  treasury: number;
  evaluate: (rivalId: string, action: DiploAction) => ProposalResult;
  onClose: () => void;
}) {
  const playerId = world.playerKingdomId;
  const rivals = world.kingdoms.filter((k) => k.id !== playerId);
  const [replies, setReplies] = useState<Record<string, ProposalResult>>({});

  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[80vh] w-96 flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Treat with the crowns
          </div>
          <h3 className="gilded font-display text-xl leading-tight">Diplomacy</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="stage-scroll flex-1 space-y-2.5 overflow-y-auto p-3">
        {rivals.map((k) => {
          const rel = getRelation(dip, playerId, k.id);
          const sm = STANCE_META[rel.stance];
          const reply = replies[k.id];
          return (
            <div key={k.id} className="rounded-sm border border-white/10 bg-black/25 p-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-[2px]"
                  style={{ background: k.color }}
                />
                <span className="min-w-0 flex-1 truncate font-display text-base text-gold">
                  {k.name}
                </span>
                <span
                  className="rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-wide"
                  style={{ borderColor: `${sm.color}66`, color: sm.color }}
                >
                  {sm.label}
                </span>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Opinion
                </span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: rel.opinion >= 0 ? "50%" : `${50 + rel.opinion / 2}%`,
                      width: `${Math.abs(rel.opinion) / 2}%`,
                      background: rel.opinion >= 0 ? "#7ea86a" : "#d1603a",
                    }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
                </div>
                <span className="w-7 text-right text-[9px] tabular-nums text-muted-foreground">
                  {rel.opinion > 0 ? `+${rel.opinion}` : rel.opinion}
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {ACTIONS[rel.stance].map(({ action, label }) => {
                  const costly = action === "tribute";
                  const disabled = costly && treasury < 60;
                  return (
                    <button
                      key={action}
                      type="button"
                      disabled={disabled}
                      onClick={() => setReplies((r) => ({ ...r, [k.id]: evaluate(k.id, action) }))}
                      className={`rounded-sm border px-2 py-1 text-[10px] transition disabled:opacity-40 ${
                        action === "declare_war"
                          ? "border-destructive/40 text-destructive hover:bg-destructive/10"
                          : "border-white/15 text-muted-foreground hover:border-gold/50 hover:text-gold"
                      }`}
                    >
                      {label}
                      {costly ? " (60g)" : ""}
                    </button>
                  );
                })}
              </div>

              {reply && (
                <p
                  className="mt-2 border-l-2 pl-2.5 text-[12px] italic leading-snug"
                  style={{
                    borderColor: reply.accepted ? "#7ea86a88" : "#d1603a88",
                    color: reply.accepted ? "#c8d8b8" : "#e0b0a0",
                  }}
                >
                  <span className="mr-1 not-italic">
                    <GameIcon
                      name={reply.accepted ? "scroll" : "swords"}
                      size={11}
                      className="inline"
                    />
                  </span>
                  {reply.response}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
