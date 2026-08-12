# Ashen Legacy — Systems Bible

**Version 0.3 · Draft canon · 12 August 2026**
Canonical systems-design reference for *Ashen Legacy*, the dark-fantasy MMORPG set in Aethyr. Companion to the **Story Bible v0.1**. Where the Story Bible governs *what is true*, this document governs *what the player does*.

> **Precedence.** On matters of fiction, the Story Bible wins. On matters of mechanics, this bible wins. Where a system contradicts the fiction, the system is wrong and gets redesigned — fiction is not retrofitted to excuse a mechanic. The One Law ("Ash always collects") binds both documents equally.

**Canon markers (identical to the Story Bible):**
- **[CANON]** — a locked design decision. Changing it requires a version bump + change-log note.
- **[OPEN]** — a deliberately unresolved value or system, reserved on purpose. Do not silently fix in content.
- **[GUIDANCE]** — craft/house direction for designers.
- **[TUNING]** — a placeholder number. Real, but provisional; expected to move in balance passes. Not a canon lock.

**Pillar test.** Every system below is annotated with the pillar(s) it serves. A system that serves none of the three pillars is cut, not kept.
1. **Territory is identity.** 2. **The world is unforgiving, not cruel.** 3. **Legacy is the only victory.**

**Narrative + systems owner: [ASSIGN].** Assign one systems owner before a second designer touches numbers.

---

## 0 · The Problem This Document Solves

The Story Bible is a strong fiction and a weak game. It answers "what is Aethyr" and barely answers "what does a player do with their hands." This bible fills the five holes that fiction cannot fill on its own, in priority order:

1. **The Legacy system** — the game's stated only victory condition, previously one sentence of flavour. §7.
2. **The core loop** — the minute/week/season verbs. §1.
3. **Siege & territory** — how castles actually change hands, and the 4 a.m. problem. §2.
4. **"Ash always collects" as mechanics** — a fiction rule given numeric teeth. §3.
5. **Death, economy, retention, social, business** — the connective tissue that keeps a no-ending game alive. §4–6, §8–9.

**[GUIDANCE]** Read §7 first if you read nothing else. Legacy is the differentiator; everything else is table stakes executed well.

---

## 1 · The Core Loop

**Serves: all three pillars.** A loop is a promise of *what you'll be doing*, at three time-scales. If a feature does not feed one of these loops, it is content, not a system.

### 1.1 Session loop (~30–90 min) — **Muster · Contest · Bank · Extract**

The atomic unit of play, built on an **extraction spine** so that every session has stakes and a clean exit.

| Beat | Verb | What's happening |
|---|---|---|
| **Muster** | Prepare | Kit up at a warded holding, join a warband, accept contracts/bounties, declare a target. Ash Debt is cleared here (§3) — the only safe place to do so. |
| **Contest** | Fight / gather / haul | Go into contested ground to *do* something with a loss condition: gather raw Ash, escort a haul, break or defend a ward, hunt a named target. Risk scales with zone (§4). |
| **Bank** | Secure | Convert the run into permanence: deposit Ash at a holding, inscribe a Deed (§7), settle a contract. Unbanked gains are droppable (§4). |
| **Extract** | Exit | Reach a warded flame and log the session as a win, a loss, or a legend. Dying before Extract forfeits the unbanked run and accrues Ash Debt. |

**[CANON]** Every session must offer a meaningful **secure-or-push** decision: bank a modest gain now, or press deeper for more and risk losing all of it. This is the heartbeat of "unforgiving, not cruel" — the world never takes what you banked; it only takes what you gambled.

### 1.2 Weekly loop — **the Siege Cadence**

| Cadence | Event |
|---|---|
| Vulnerability windows | Holdings become attackable only in declared windows (§2.3). Most fall on evenings/weekends by holder choice. |
| Ledger settlement | The Gilded Compact's debts, insurance, and bounties clear weekly (§6.3). Payday and reckoning. |
| Ash tide | A rolling forecast of where raw Ash is thickest this week, steering PvE and conflict without scripting it. |
| Long Night forecast | A visible, rising pressure gauge (§5) telling the server *roughly* when the next Long Night hits — never the exact hour. |

### 1.3 Seasonal loop — **the Season of Ash** (~10–12 weeks) — **[TUNING]**

**[CANON]** The game has no ending; it has **seasons**, each a chapter of the same unending war. A season:

1. **Kindling (weeks 1–2):** map perturbed (§2.6), holdings neutralised to Outpost tier, fresh Ash tide. Land-grab.
2. **The War (weeks 3–9):** the siege cadence runs hot; territory consolidates; Houses build renown.
3. **The Long Night (week 10–11):** the seasonal climax (§5). Realms are *forced* into truce to survive a server-wide threat. The season's defining Deeds are minted here.
4. **The Reckoning (week 12):** legacy is tallied and **inscribed permanently** (§7). Seasonal ranks reset; the Chronicle does not.

**What persists vs. resets — [CANON]:**

| Persists forever | Resets each season |
|---|---|
| The Chronicle (every Deed, every name) | Territorial ownership (perturbed, not wiped) |
| Character progression & unlocks | Seasonal renown ranks & ladders |
| Physical inscriptions until overwritten | The Ash tide & Long Night pressure |
| Heraldry, titles, monuments earned | "Current holder" of every castle |

**[GUIDANCE]** The reset is a *perturbation*, not a wipe. A dominant coalition starts a new season advantaged but not enthroned — enough to make last season matter, not so much that new players face a permanent aristocracy. Tune the perturbation to the median guild's tolerance, not the top guild's ego.

---

## 2 · Siege & Territory

**Serves: Pillar 1 (Territory is identity).** This is the box the Story Bible left empty. Everything here answers one question the fiction dodged: *how does Castle Vareth actually change hands, and what stops it from changing hands at 4 a.m. while the owners sleep?*

### 2.1 Holding tiers — territory maps to social tier

| Tier | Held by | Grants | Fiction |
|---|---|---|---|
| **Outpost** | A Warband or a soloist | Local Ash node, respawn anchor, small tithe | A claimed ruin, a burned watchpost |
| **Keep** | A House (guild) | Crafting stations, storage vault, ward network, Deed inscription rights | A rebuilt fort |
| **Castle** | A Banner (coalition) | Regional Ash tithe, trade taxation, seat-level Runeward, the richest inscription surfaces | Vareth, and the other realm seats |

**[CANON]** Territory tiers and social tiers (§8) are the **same ladder**. You cannot hold a Castle as a soloist, and the game never pretends you can. Power is a thing others can see you holding — held *by a group others can name*.

### 2.2 Conquest — you break a ward, you don't grind a health bar

**[CANON]** A holding is taken by defeating its **Runeward** (fiction: §4 of the Story Bible, Runewarding), not by attritioning a keep's hit points. Sieges are objective-driven and phased:

1. **Declaration.** An attacker plants a **Siege Beacon** within the target's vulnerability window (§2.3). This is public and pings the holder. No stealth conquest.
2. **The Break.** Attackers must channel/destroy Ward-anchors while defenders hold them. Multi-point so numbers matter but a smaller, coordinated force can split a larger one.
3. **The Seat.** With the Runeward broken, an attacker channels the seat. Defenders can still reclaim it until the channel completes — a real last-stand window.
4. **Inscription.** On capture, the taking House may carve its sigil into the seat (§7.4), overwriting the previous holder's mark. *This is the moment territory becomes legacy.*

### 2.3 The Vulnerability Window — the 4 a.m. problem, solved

**[CANON]** This is the single most important rule in this section. Get it wrong and the game dies; every territory MMO that ignored it has proven the point.

- Every Keep and Castle holder **declares a Vulnerability Window**: a fixed block (**[TUNING]** ~2–4 hours) on set days when their holding can be attacked.
- **Outside the window, a holding cannot be conquered.** It can be raided for resources, but the seat is safe.
- Windows are **public** — attackers plan around them; a holder cannot hide their window to dodge fights.
- A holding's window must total a **minimum weekly exposure** (**[TUNING]** ~6 hours) so no one banks territory behind an un-attackable schedule.
- **[GUIDANCE]** Tie window length to tier: Castles expose more than Keeps. The reward of the crown jewel is inseparable from the obligation to defend it in daylight.

**Why this and not free-for-all sieges:** a global "attack anytime" model means the winner is whoever has players awake at the defender's 4 a.m. That rewards timezone-stacking and off-hours ganking over skill and coordination — the opposite of "unforgiving, not cruel." Windows make defence *possible*, which is what makes holding *meaningful*.

### 2.4 Defender asymmetry — and the anti-turtle valve

Defenders get real, earned advantages so that defending is a viable playstyle:
- Prepared positions, pre-placed wards, faster respawn at the seat, knowledge of the ground.
- **Ward Charge:** defensive strength built up by *using* the holding (trade, crafting, presence) between sieges — an active, hold-it-by-living-in-it advantage, not a passive wall.

**[CANON] The anti-turtle valve — Ashen Toll.** A held seat **accrues Ash Debt of its own** (§3) the longer it is held unchallenged. Past a threshold, the Ashenward weakens: tithes shrink, wards dim, the Long Night targets it harder. **You cannot hold forever without cost.** The One Law applies to castles as it applies to casters — permanence is bought with escalating debt, never for free.

### 2.5 What holding actually grants — **[CANON]**

Concrete, so "territory is identity" is mechanical, not flavour:
- **Ash tithe** — a cut of raw Ash gathered in the region.
- **Trade taxation** — Castles tax movement of goods through their region (Vareth "taxes half the continent's trade" becomes a real number the Compact can model).
- **Logistics** — respawn anchoring, fast-travel gating, supply for allied warbands.
- **Crafting & storage** — Keep+ unlocks stations and a vault (partially protected, §4).
- **Inscription rights** — the seat is a legacy surface. *This is the grant that matters most.* You do not hold Vareth for the tax; you hold it so your House sigil is the one carved in its stone when the season is chronicled.

### 2.6 Map perturbation — no permanent winner — **[CANON]**

At each season's Kindling, the map is *perturbed*: some Ash nodes migrate, some ruins rise/fall, seats reset to Outpost tier. Last season's dominant Banner keeps its Chronicle, its heraldry, and a head-start — but not the throne. **[OPEN] P1 — perturbation magnitude.** How much the map shifts is reserved for live tuning; it is the primary dial between "returning players feel their history mattered" and "new players face a frozen aristocracy." Do not lock it until two seasons of data exist.

---

## 3 · The One Law, Mechanised — **Ash Debt**

**Serves: Pillars 2 & 3.** The Story Bible's finest idea — "Ash always collects" — had no teeth. Here it becomes the spine of combat, progression, and risk. **[CANON]** Every source of power in the game routes through this system. No exceptions; an exception is a canon bug.

### 3.1 The dual resource — Vigour and Ash Debt

Every character runs on two meters:

| Meter | Behaviour |
|---|---|
| **Vigour** | The moment-to-moment pool (stamina/focus analogue). Spent on ordinary actions; regenerates in combat. This is the "free" tier — Embercraft's baseline, a warrior's swings. |
| **Ash Debt** | Accrued when you reach *past* Vigour for greater power. **Does not auto-clear.** It follows you between fights, between sessions, until you pay it down at a warded flame (§1.1 Muster). |

**[CANON] Debt suppresses Vigour.** The more Ash Debt you carry, the smaller your usable Vigour pool. Push your power hard and you burn yourself down — you hit harder now and weaker for the rest of the run. This is *why the strongest mages are rarely the oldest* (Story Bible §4), expressed as a curve a player feels every fight.

**[CANON] Overdraw — the active push.** Debt is not only a punishment for dying; it is a *choice* the player reaches for. On a committed action (v1: charging the World Boss) a warband may **Overdraw** — reach past its Vigour for a burst of power **now** (**[TUNING]** +55% to the blow) in exchange for banked Ash Debt (**[TUNING]** +30) and a sharply higher chance of a champion falling on that charge (**[TUNING]** ×1.7 risk). This is the push-your-luck heartbeat of the One Law: outsized force, paid for after. *Implemented v0.3.*

**[CANON] Searing — the debt that burns.** Past a threshold of carried debt (**[TUNING]** ≥150) the host is **Searing**: the Ash is burning it alive, and every risky action is far deadlier (**[TUNING]** ×1.35 death risk on top of everything else) until the debt is rested off at a warded flame. High debt is not merely "weaker" — it is *dangerous to field*. *Implemented v0.3.*

### 3.2 The three disciplines pay three different prices — **[CANON]**

Maps directly to the Story Bible's magic table. **Name the cost before the effect** (Story Bible [GUIDANCE]).

| Discipline | Debt currency | Mechanical cost | Clears at |
|---|---|---|---|
| **Embercraft** | **Searing** | Accrues Ash Debt → shrinks Vigour; at high Searing, damage-over-time self-burn | A warded flame (rest) |
| **The Hollow Arts** | **Years / Memory** | The deepest tier: pays in *character resource* — temporary attribute/level drain ("Years") or a locked skill loadout ("Memory") that must be recovered, not merely rested off | Rites, offerings, time — never free (Covenant only; illegal elsewhere) |
| **Runewarding** | **Material & Time** | Pays in gathered Ash, reagents, and channel time up front — the body is spared, the wallet and the clock are not | Paid at cast; nothing lingers on the body |

**[GUIDANCE]** Embercraft is the "fast now, weak later" tier every class can touch. The Hollow Arts are the "mortgage your character" tier — enormous burst that can leave you diminished for hours, which is *why six realms hang you for it* and the Covenant reveres it. Runewarding is the "no shortcuts, pay full price at the counter" tier that anchors crafting and defence. A player should be able to describe any ability as one of these three bargains.

### 3.3 Death feeds Debt — **[CANON]**

Dying accrues Ash Debt. The world literally collects on your death (§4). This couples the death model to the One Law: a reckless run that ends in death leaves you *carrying* the cost into your next session until you rest. Grim, fair, and thematically exact.

### 3.4 Progression — horizontal-led, Debt-gated

**[CANON]** Vertical power (levels, gear tiers) is **shallow and capped**; horizontal power (the 12 base classes → 24 awakenings of Story Bible §10, plus discipline mastery) is **deep**. Reasons: a full-loot economy (§4) collapses if gear grants runaway power, and "territory is identity" dies if a numeric power gap decides every siege. **[TUNING]** Target a top-to-fresh effective-power ratio narrow enough that numbers, position, and coordination beat raw level — closer to a survival-MMO curve than a theme-park one. Mastery deepens *options*, not raw stats.

---

## 4 · Death, Loot & Risk

**Serves: Pillar 2 (unforgiving, not cruel).** The Story Bible asserts full-loot and grimdark permanence and then specifies neither. Here is the model, tuned so the world is *harsh but fair* and a new player is not farmed to quitting in their first hour.

### 4.1 Zone-tiered risk — **[CANON]**

Risk is legible from the map. A player always knows what they stand to lose before they enter.

| Zone class | Loot on death | Example | Purpose |
|---|---|---|---|
| **Warded (safe-ish)** | Durability + res-sickness + Ash Debt. No item loss. | The Ashen Reach (starter) | Onboarding, crafting, recovery. The crucible where you learn the game without being stripped. |
| **Contested (frontier)** | **Partial loot:** unbanked Ash + unsecured carried items drop; equipped/insured kit survives | Most of the open world; siege regions | The main game. Real stakes, recoverable losses. |
| **Full-loot (raid)** | **Everything droppable.** No insurance past the threshold. | The Embervault, deep Drowned Cathedrals | Maximum-stakes, maximum-reward. Opt-in by walking through the door. |

**[CANON]** The threshold into a full-loot zone is a *visible, deliberate act* — a warned crossing, never an accident. "No rules past the threshold" (Story Bible §7) means the player chose the threshold with both eyes open.

### 4.2 No forced permadeath — permanence lives in Legacy, not deletion — **[CANON]**

Character permadeath as a default is a retention wound this game does not need; permanence is already expressed through the Chronicle (§7) and through Ash Debt scars. So: **no involuntary character deletion, ever.**

**[CANON] The Ashen Oath (opt-in permadeath).** A player may *swear an Oath* for a season: play a character that can die permanently. In exchange, that character earns **outsized legacy** — Oathsworn Deeds weigh far more in the Chronicle, and dying under Oath is itself a recorded, honoured Deed (fiction: Warden-Fallen, §8). This gives the grimdark crowd true permanence and the prestige it craves, without punishing the median player who just wants to log in and fight. **[TUNING]** Oath legacy multiplier reserved for balance.

### 4.3 Insurance, sinks, and the recovery curve

- **Insurance** (underwritten by the Gilded Compact, §6.3) lets Contested-zone players protect a kit for a premium — a player-run safety net, not a system handout.
- **Res-sickness** and durability loss give death a sting without a spiral.
- **[GUIDANCE]** The recovery curve is the whole ballgame for "not cruel": a bad night should cost a fresh player an evening of rebuilding, never their account's worth of progress. Test the model against the *worst plausible night* a new player can have, and tune to that, not to the veteran's.

---

## 5 · The Long Night, as a System

**Serves: Pillars 2 & 3.** The Story Bible frames the Long Night as the pressure-release valve against faction stalemate. Here is the machinery.

### 5.1 The pressure gauge — **[CANON]**

A server-wide **Long Night pressure** gauge rises over a season (roughly tracking §1.3). It is *visible and rising* but the exact trigger hour is hidden — the horror is the *uncertainty*, per the Story Bible's treatment of the Pale Sovereign and the Sunless Choir's true numbers.

### 5.2 The forced truce — **[CANON]**

When the Long Night breaks, a **server threat** arrives that no single Banner can survive alone: Gloomstalkers pour out, the Drowned rise, and at the deepest heart the **Pale Sovereign** walks (Story Bible §5, §8). Mechanically it **briefly outranks politics**: siege windows suspend, tithes freeze, and enemy realms share objectives or all lose ground. It has "ended more alliances than any siege" because the truce is real, temporary, and remembered — who *held the line beside you*, and who *broke faith*, both become Deeds.

### 5.3 The climax and its Deeds — **[CANON]**

The seasonal Long Night (§1.3) is where the season's defining legacy is minted: holding a Castle *through* the Night, surviving a Pale Sovereign encounter, being the House that broke the truce and profited, or the Warden line that held and fell. **[OPEN]** The Pale Sovereign's mechanics, and anything confirming *what it is* (Story Bible Q2), are reserved. Foreshadow in systems; explain nothing.

---

## 6 · Economy & the Gilded Compact

**Serves: Pillars 1 & 3.** The Story Bible gives the Compact an identity ("the ledger") and no ledger. Here is the economy and the faction mechanic that owns it.

### 6.1 A destruction economy — **[CANON]**

Full-loot (§4) means gear is *consumed*, so demand never dries up. This is the engine that keeps crafting, gathering, and trade permanently relevant.

- **Faucets:** raw Ash gathering, PvE drops, Long Night rewards.
- **Sinks:** full-loot destruction, crafting failure/loss, ward upkeep, the Ashen Toll (§2.4), taxes and tithes, insurance premiums.
- **[GUIDANCE]** Keep faucets and sinks in visible tension. A destruction economy that leaks (too many faucets) inflates into meaninglessness; one that over-sinks starves new players. The Compact's ledger (§6.3) is partly a *player-run* balancing mechanism — lean on it before adding system-level fixes.

### 6.2 Ash as a decaying currency — **[CANON]**

**Raw Ash never settles** (Story Bible §4) — so **raw Ash slowly decays if hoarded.** It must be spent, refined into stable forms, or bound into wards before it burns off. This is on-theme (Ash always collects, even from your vault) and does real economic work: it discourages dragon-hoarding, keeps currency circulating, and pressures players to *do something* with gains rather than sit on them. Refined/bound forms are stable stores of value; raw Ash is a hot potato. **[TUNING]** Decay rate reserved — this dial is powerful and easy to over-crank.

### 6.3 The Ledger — the Compact's faction mechanic — **[CANON]**

The Gilded Compact is a **player faction whose power is the Ledger**: a suite of financial instruments only they can issue and enforce, making "every crown has a price, we keep the ledger" a system, not a slogan.

- **Insurance underwriting** — Compact players sell kit-insurance (§4.3) and bear the risk. Profit if the insured survives; pay out if they die.
- **Loans & holding finance** — Banners borrow Ash to fund a siege campaign, collateralised against their holdings. Default, and the collateral is called — a Castle can fall to a *debt*, not just a sword.
- **Bounties** — placed, escrowed, and paid out through the Ledger; the Compact takes a cut.
- **Contracts & escrow** — enforceable player agreements (haul this, hold this, don't attack until date X) with Compact-held collateral.
- **Weekly settlement** (§1.2) — debts, premiums, and bounties clear on a cadence, creating a rhythm of payday and reckoning.

**[GUIDANCE]** The Compact should be able to *win economic storylines without ever winning a siege* — the quiet antagonist of §6 of the Story Bible. A Banner that wins every battle and loses the Ledger loses the war. That asymmetry is the point. **[OPEN] E1 — degree of Compact debt enforcement** (can a debt truly force a Castle to change hands?) reserved until siege and economy have live data; it is potent and exploitable and must not ship un-tuned.

---

## 7 · The Legacy System — *the only victory*

**Serves: Pillar 3, and it is the reason this game exists.** The Story Bible names Legacy the sole victory condition, then defines it in one sentence ("empty space left for players"). This section is the largest in the bible on purpose. If every other system here shipped and this one didn't, you'd have a competent territory MMO indistinguishable from a dozen others. This is the differentiator. Build it first.

### 7.1 The design paradox, resolved — **[CANON]**

The Story Bible sets a trap: legacy must be **permanent** ("write toward permanence") yet **contestable** ("whose name survives in the stone"). Permanent-and-contestable is a contradiction unless you split the concept in two:

- **The Chronicle is permanent.** An append-only server history. Every Deed, every name, forever. Never deleted, never overwritten. *This* is the permanence.
- **Inscriptions are contestable.** The *physical* marks on the world — sigils on castles, names on monuments — can be defaced or overwritten by whoever next holds the ground. *This* is the contest.

So a name that was carved on Vareth and later scratched out is *still in the Chronicle forever* — "you held Vareth in the Season of Ash" is permanent truth — but the stone itself now bears someone else's mark. Both pillars satisfied. **This split is the keystone of the entire system; do not collapse it.**

### 7.2 Deeds — the atoms of legacy — **[CANON]**

A **Deed** is a recordable, meaningful act. Deeds are the currency of legacy. Categories:

| Deed class | Examples |
|---|---|
| **Conquest** | Take a Castle; break a famed Runeward; win a siege outnumbered |
| **Endurance** | Hold a seat through a Long Night; survive a Pale Sovereign encounter |
| **First** | Server-first anything: first to saddle an Ash-Drake, first to clear the Embervault, first Castle of the season |
| **Sacrifice** | Die under an Ashen Oath (§4.2); fall holding the line in a Long Night truce |
| **Infamy** | Break a truce and profit; ruin a House via the Ledger; claim a bounty on a famous name |
| **Craft** | Forge a server-recognised artifact; ward a Castle that survives a season |

**[GUIDANCE]** Deeds must be *earned in the world by doing the loop*, never bought and never handed out for grinding. A Deed a player can farm is not a legacy; it's a chore. Scarcity is the value. **[OPEN] L1 — the full Deed catalogue and their Chronicle weights** are reserved; seed conservatively and expand from live behaviour, because inflating Deeds is irreversible.

### 7.3 The Chronicle — permanence you can query — **[CANON]**

- Append-only, server-scoped history. Every Deed timestamped to its season.
- **Queryable per player, per House, per Castle, per season.** "Who has held Vareth?" returns an ordered, permanent list. "What did I do in the Season of Ash?" returns your record.
- Names are **never** removed. This is the literal mechanism of "whose name survives in the stone."
- Surfaces in-world at the **Founders' Monument** (Story Bible §7) and at every Castle seat.

### 7.4 Inscription — legacy as a player act, in the world — **[CANON]**

Deeds don't auto-post; a player **inscribes** them, and inscription is an act with cost and risk:

- **Costs Ash** (§6) — the One Law applies; being remembered is paid for.
- **Happens at a surface:** the Founders' Monument, a held Keep/Castle seat, or a personal gravestone.
- **Is contestable:** whoever next holds the ground can *deface or overwrite* your inscription. Taking Vareth lets you scratch out the last holder's sigil and carve your own (§2.2, step 4). The Chronicle still remembers both — but the *stone* shows the victor.
- **[GUIDANCE]** Make inscription a *ceremony*, not a menu click. The moment a House carves its mark into a Castle it bled for should feel like the payoff of the whole season. This is the emotional core of the game; give it weight, animation, presence, and an audience.

### 7.5 Renown — prestige, never power — **[CANON]**

Legacy converts to **Renown**: individual and House standing that unlocks **cosmetic, social, and heraldic** rewards — titles, heraldry, monument space, unique visual marks, access to ceremonies — and **never combat power.**

**[CANON] Legacy grants no stats.** The instant legacy buys power, three things die: new players face an un-closable gap, the destruction economy destabilises, and "territory is identity" degrades into "whoever won last season wins forever." Renown makes you *known*, not *stronger*. Guard this line like the game depends on it, because it does.

### 7.6 Inheritance — permanence beyond one character — **[CANON]**

Legacy outlives the character who earned it:
- A retiring or Oath-fallen character may **will** their legacy — heraldry, titles, a named artifact — to an **heir** (another character) or to their **House**.
- Houses accrue a **lineage**: the Chronicle of every member who ever flew the banner.
- **[GUIDANCE]** This closes the loop on "legacy is the only victory." You cannot beat the game, but you can *be inherited* — your name carried by players who come after, exactly the fiction's promise (Story Bible §9, "You, the Unwritten"). Design retirement as a dignified, celebrated act, not a delete button.

### 7.7 Anti-abuse — **[GUIDANCE]**

Legacy systems are catnip for exploiters: collusion (feeding each other Deeds), sockpuppet infamy, monument-griefing. Guardrails: Deeds require genuine opposed effort where possible; infamy against alts/newbies is weighted near-zero; inscription surfaces have anti-grief cooldowns; server-firsts are validated. **[OPEN] L2 — anti-collusion ruleset** reserved for a dedicated pass; assume adversaries are creative and treat this as ongoing, not solved.

---

## 8 · Social Structure

**Serves: Pillar 1.** Territory war is group content; the Story Bible never says who groups, or how. The social ladder *is* the territory ladder (§2.1).

| Tier | Size **[TUNING]** | Holds | Fiction |
|---|---|---|---|
| **Warband** | ~5 | Outpost | An adventuring party; the session unit (§1.1) |
| **House** | up to ~50 | Keep | A guild; the core social identity, carries heraldry & lineage (§7.6) |
| **Banner** | coalition of Houses | Castle | An alliance; the only body that can hold a realm seat |

- **Realms vs. Houses.** The seven realms (Story Bible §6) are *ideological factions* a House aligns to; Banners are the *practical* alliances that fight. A House swears to a realm for identity and buffs-to-flavour, not as a hard team-lock — this keeps politics fluid and betrayal (an Infamy Deed, §7.2) possible.
- **Race is heritage, realm is choice — [CANON].** Houses are **race-mixed**; any race may fly any banner (Story Bible §6.1, locked 11 Aug 2026). Race is not a faction and there are no race-nations — ancestral seats are contested *ruins*, and three races have none. Cooperation is therefore built into the smallest social unit: your closest ally of another blood stands in your House. War is fought between *causes*, not species. This rule is load-bearing for cooperation; a race-locked or race-vs-race model breaks it and is a canon bug.
- **The Free Holds enablement — [CANON]:** neutral, realm-agnostic holdings any Warband/House can contest without swearing to a realm. This is the mechanical home of the Free Holds' "no king, no leash" identity and the light-touch, player-driven fiction the Story Bible reserved for guild stories.
- **[OPEN] S1 — hard caps vs. soft caps** on House/Banner size reserved; the tension is zerg-suppression vs. player freedom, and it is not solvable on paper.

### 8.1 · Feudal Infrastructure — voluntary, never enforced

**Serves: Pillars 1 & 3.** Feudalism is the native political form of a shattered empire, and it supplies the *obligation* the social ladder (§8) otherwise lacks — the thing that makes a vassal House actually turn out for its liege's siege. **[CANON] The engine offers feudal tools; it never enforces feudal obligation.** The game provides primitives — fealty oaths, tribute splits, sub-fief grants, titles, and Compact-enforced contracts (§6.3) — and players build the hierarchies by hand. No tribute is auto-collected, no asset auto-seized, no service compelled. This line separates feudal drama from serfdom, and serfs quit.

**The third axis of belonging — [CANON].** Allegiance is distinct from race and realm; the three never collapse into one another.

| Axis | Bound to | Nature |
|---|---|---|
| **Heritage** | Race (Story Bible §6.1) | Born. Culture and bargain with the Ash. |
| **Belief** | Realm (§6; realm system-role) | Chosen. Creed, exclusive access, the argument about the crown. |
| **Allegiance** | A **lord** — a player/House | Sworn. Fealty, tithe, and service — freely given, freely broken. |

Fealty is sworn to a *person*, never an ideology. A vassal and their lord may hold different realms; two lords of the same realm may still war. Keep the axes clean.

**The bargain — [CANON].** A vassal House swears to a liege (a Keep- or Castle-holding House/Banner) and, by terms *they negotiate*, owes some mix of **tithe** (a share of Ash/taxes up the chain) and **service** (turning out for the liege's sieges and defences, §2). In return the liege owes **protection**, a **share of the holdings' taxes**, and **access** (logistics, crafting, safe-havens, §2.5). None engine-mandated; all oath-and-reputation.

**Enforcement is social and economic, never mechanical — [CANON].** A broken oath is punished by consequence, not by a system confiscating goods:
- **Reputation** — oath-breaking is public and Chronicle-recorded (an Infamy Deed, §7.2). Faithless vassals struggle to find a new liege; faithless lords bleed vassals.
- **The Ledger** — feudal terms can be written as Compact contracts (§6.3) with escrowed collateral: the one path to hard enforcement, and it is *opt-in by both parties*, not imposed by the world.
- **The sword** — a lord whose vassal defaults may siege them under the normal rules (§2.3). Force is legitimate; automatic seizure is not.

**Per-realm expression — [CANON].** Realms do not run feudalism identically; *how a realm structures allegiance is a core part of its distinct system-role* (closing the realm-role gap):
- **Ember Court** — classical rigid pyramid: formal titles, deep vassal chains.
- **Gilded Compact** — feudalism-as-debt: allegiance as owed Ash, enforced through the Ledger, not sworn fealty.
- **Hollow Covenant** — theocratic hierarchy: fealty as faith, rank as devotion.
- **The Free Holds** — **anti-feudal by identity.** No lords, no fealty, no tithe. Flat, mercenary, contract-only ("no king, no leash," Story Bible §6). Their carve-out is [CANON]: the Free Holds opt out of the feudal layer entirely and are compensated for it — no defection friction, mercenary access, total flexibility. Unaligned is a *build*, not a penalty.
- **[OPEN] F1 — feudal expression of the Verdant Reclamation, Pale Wardens, and Sunless Choir** reserved; design alongside their realm meta-games so all seven differ meaningfully.

**Legacy at the top of the pyramid — [CANON].** A great lord's legacy is not their own sword but the **lineage of Houses that flew their banner** (§7.6). Titles held, vassals kept, oaths honoured or broken — all Chronicle-recorded. Being a legendary *liege*, or a legendary *oath-breaker*, is a legacy path that never requires personal combat. This is how feudalism serves Pillar 3.

**Build order — primitives first — [GUIDANCE].** Do **not** build a Crusader-Kings obligation simulation for v1. Ship the primitives and let feudalism *emerge* by hand. Only if players are already running deep hierarchies manually and constantly do you formalise a feudal UI. Prove the behaviour before you automate it; a heavy feudal engine is a multi-year build for demand not yet demonstrated.

**Anti-calcification — [GUIDANCE].** Feudalism concentrates power and can freeze into a permanent aristocracy new players can't crack — the same risk map perturbation (§2.6) fights. The voluntary model *is* the primary defence: a lord who cannot protect or reward loses vassals every season, so power must be re-earned, not merely inherited. **[OPEN] F2 — how hard social/economic enforcement should bite, and the catch-up weighting against calcification** reserved for live tuning; too soft and oaths mean nothing, too hard and you have serfdom.

**Leadership-layer only — [CANON].** Feudal systems are dark matter to the new and the solo. A first-week or unaligned player never needs to understand fealty to play; this is infrastructure for House and Banner leaders negotiating power. If onboarding (§9.1) ever has to explain vassalage, the system is overbuilt.

---

## 9 · New Player Experience & Business Model

### 9.1 Onboarding — the Ashen Reach as a crucible — **[CANON]**

**Serves: Pillar 2.** A full-loot grimdark world is a cliff for new players; the Ashen Reach (Story Bible §7) is the ledge before it. In the Reach:
- **Warded-zone rules** (§4.1): no item loss, safe to learn.
- The **full session loop** (§1.1) is taught with real stakes but recoverable ones.
- The **Ash Debt system** (§3) is introduced gently — you feel the bargain before it can ruin you.
- **The Long Night reaches even here** (Story Bible §7, "safe-ish until the Long Night") — the first taste of the real game's teeth, on a survivable scale.

**[GUIDANCE]** The onboarding's job is to make the secure-or-push decision (§1.1) instinctive *before* the player ever risks real loot. A new player who understands banking will survive the frontier; one who doesn't will quit. Teach the instinct, not the lore.

### 9.2 Business model — **[CANON]**

**Buy-to-play + cosmetic-only shop + optional convenience subscription.** Reasoning, in order of weight:

1. **No pay-to-win, non-negotiable.** In a full-loot PvP game, purchasable power is lethal — it poisons the destruction economy, the siege balance, and player trust simultaneously. This is a design constraint, not a monetisation preference.
2. **Buy-to-play** front-loads revenue and raises the griefer/bot cost of entry — valuable in a full-loot world.
3. **Cosmetic-only shop** monetises the game's strongest asset: identity and legacy vanity (heraldry, mounts like the saddled Ash-Drake, inscription flourishes). It sells *prestige*, which the whole game is already about — perfectly aligned incentive.
4. **Optional subscription** sells *convenience and social tooling* (extra character slots, House-management tools, cosmetic pass) — never power, never loot advantage.

**[GUIDANCE]** Every monetisation decision passes one test: *does this let a player buy Renown or power they did not earn in the world?* If yes, cut it. Legacy is sacred (§7.5); the moment the shop sells it, the pillar is dead. **[OPEN] B1 — seasonal cosmetic pass structure** reserved; passes are easy to make predatory and must be designed against that, not toward it.

---

## 10 · Cross-Pillar Audit

**[GUIDANCE]** Every system, checked against the three pillars. A system serving none is cut.

| System | P1 Territory | P2 Unforgiving-not-cruel | P3 Legacy |
|---|---|---|---|
| Core loop (§1) | ✓ siege cadence | ✓ secure-or-push | ✓ inscribe beat |
| Siege & territory (§2) | ✓✓ core | ✓ windows = fair | ✓ inscription rights |
| Ash Debt (§3) | ✓ Ashen Toll | ✓✓ cost, never cruel | ✓ debt scars |
| Death & loot (§4) | ✓ frontier stakes | ✓✓ core | ✓ Ashen Oath |
| Long Night (§5) | ✓ suspends politics | ✓✓ shared threat | ✓ climax Deeds |
| Economy & Ledger (§6) | ✓ finance sieges | ✓ recoverable loss | ✓ infamy via debt |
| **Legacy (§7)** | ✓ contested stone | ✓ prestige not power | ✓✓✓ **the pillar** |
| Social (§8) | ✓✓ ladder = tiers | — | ✓ House lineage |
| Feudal (§8.1) | ✓✓ obligation binds the tiers | ✓ voluntary, not serfdom | ✓ liege lineage |
| NPE & business (§9) | — | ✓✓ crucible | ✓ sells prestige |

---

## 11 · Open Systems Questions (Index)

| # | Question | Why reserved |
|---|---|---|
| P1 | Map perturbation magnitude | Balance new-player access vs. returning-player history |
| E1 | Degree of Compact debt enforcement | Potent, exploitable; needs live siege+economy data |
| L1 | Full Deed catalogue & Chronicle weights | Deed inflation is irreversible; seed conservatively |
| L2 | Anti-collusion / anti-grief ruleset | Adversarial; ongoing, not one-and-done |
| S1 | Hard vs. soft caps on House/Banner size | Zerg-suppression vs. player freedom |
| F1 | Feudal expression of Verdant, Wardens, Choir | Design alongside their realm meta-games so all seven differ |
| F2 | How hard feudal enforcement bites; anti-calcification weighting | Too soft = meaningless oaths; too hard = serfdom |
| B1 | Seasonal cosmetic pass structure | Must be designed against predatory patterns |

**Inherited from the Story Bible and still open:** Q1 (who killed Sarethar), Q2 (the Pale Sovereign), Q3 (present-day year), Q4 (seventh race), Q5 (full map), Q6 (Sunless Choir size). Systems must foreshadow these without resolving them.

---

## 12 · Version & Change Log

| Version | Date | Change |
|---|---|---|
| 0.1 | 11 Aug 2026 | Initial draft systems canon. Establishes the three-tier core loop, siege & territory (vulnerability windows, holding tiers, conquest, anti-turtle Toll, map perturbation), Ash Debt (dual-resource One Law with three discipline costs), zone-tiered death & full-loot with opt-in Ashen Oath, the Long Night as a system, the destruction economy with decaying Ash and the Compact's Ledger, the Legacy system (Chronicle/Inscription split, Deeds, Renown-not-power, inheritance), social tiers, NPE, and a cosmetic-only business model. Six systems questions logged; six Story-Bible questions carried forward. |
| 0.2 | 11 Aug 2026 | Added **§8.1 Feudal Infrastructure** [CANON]: voluntary tools, never engine-enforced obligation; the third "allegiance" axis (fealty to a lord, not a realm); the tithe/service–protection/share/access bargain; enforcement via reputation, the Ledger, and the siege — never auto-seizure; per-realm expression incl. the Free Holds anti-feudal carve-out; primitives-first build order; anti-calcification; leadership-layer only. Also logged the §8 race-mixed-House rule [CANON]. Married to Story Bible §6.1 (v0.3). F1–F2 reserved. |
| 0.3 | 12 Aug 2026 | **Depth pass — Ash Debt §3** [CANON]. Gave the One Law an active edge and a punishing tail: **Overdraw** (opt-in on a banner charge — +55% damage now, +30 debt, ×1.7 death risk) turns discipline into a live gamble instead of a passive meter; **Searing** (debt ≥150 burns the host — ×1.35 death risk on every commit until rested) makes a neglected debt actively lethal rather than merely a soft cap. Both *Implemented v0.3* in engine `ASH_DEBT` + `isSearing()`, `commitBanner(partyId, overdraw)`, and the Warfront Ash Debt card. |

---
*Companion to Ashen Legacy Story Bible v0.1. Assign a systems owner before extending. Read §7 first.*
