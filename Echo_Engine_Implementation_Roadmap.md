# Echo Engine → Echoes of Tomorrow — Implementation Roadmap

*A build-order roadmap derived from the EDD's own dependency chain, repository structure, and "game-and-engine co-evolve" philosophy.*

---

## 0. How this roadmap was derived

The EDD already tells you the correct build order — it's just spread across three places instead of stated as one plan:

- **Chapter 1** says the game and engine must evolve together, and that nothing should be built before the game demands it.
- **Chapter 4** gives an explicit dependency chain: `Game → Scene Runtime → World → Assets → Framework`, with the rule that dependencies only flow downward.
- **Chapter 6** establishes that the World System, not the Three.js scene graph, is the source of truth — which means World must exist *before* Rendering is treated as anything more than a dumb consumer.

A "perfect" roadmap for a project this size isn't one that builds all 25 chapters in document order — it's one that gets a *thin, vertical slice* playable as early as possible, then thickens each layer in the same order the dependency graph demands. That's the structure below.

**Reality check first:** what's specified across these 25 chapters — a custom spatial pipeline, VAT-based crowd animation, HAOS hardware adaptation, a full editor, networking, save/versioning, and a shippable deployment pipeline — is engine-team-sized work (historically 15–40 engineers over 2–4 years for comparable scope). This roadmap doesn't shrink the scope; it sequences it so a small team (or solo dev) always has something running, instead of spending a year on infrastructure with nothing to show. Treat every phase below as "build the minimum that unblocks the next phase," not "fully implement the chapter."

---

## 1. Phase Map (dependency-ordered)

```
Phase 0   Repo, tooling, engineering standards
Phase 1   Framework core + Diagnostics bootstrap        (Ch. 3, 4, 5, 24)
Phase 2   ECS core                                       (Ch. 7)
Phase 3   World System + Matrix Spatial Pipeline          (Ch. 6)
Phase 4   Scene Runtime (D013)                            (Ch. 4 §8)
Phase 5   Asset System + Import Pipeline                  (Ch. 9, 10)
Phase 6   Minimal Rendering (consumer of World, not owner) (Ch. 11)
Phase 7   Input System                                    (Ch. 22)
   ── MILESTONE A: "Grey-box playable" ──
Phase 8   Physics & Collision                             (Ch. 15)
Phase 9   Animation + VAT pipeline                        (Ch. 12)
Phase 10  Audio System                                    (Ch. 17)
Phase 11  AI & Navigation                                 (Ch. 16)
Phase 12  Streaming & World Partition                     (Ch. 14)
Phase 13  Scripting & Gameplay Framework                  (Ch. 19)
Phase 14  UI/UX Framework                                 (Ch. 21)
Phase 15  Persistence & Save System                       (Ch. 23)
   ── MILESTONE B: "Vertical slice" ──
Phase 16  HAOS (hardware-adaptive optimization)            (Ch. 13)
Phase 17  Editor & Developer Toolchain                     (Ch. 20)
   ── MILESTONE C: "Content-ready pipeline" ──
Phase 18  Full production of Echoes of Tomorrow (content)
Phase 19  Networking & Multiplayer (only if the game needs it) (Ch. 18)
Phase 20  Security, Packaging & Deployment                 (Ch. 25)
   ── MILESTONE D: "Shippable" ──
Phase 21  Forge Engine extraction
```

Rendering deliberately sits at Phase 6, *after* World and Asset foundations — not because visuals don't matter, but because Chapter 6's whole argument is that rendering must stay a downstream consumer. Building it first is exactly the trap the EDD says to avoid.

---

## 2. Phase 0 — Repo, Tooling, Engineering Standards
**Unblocks everything. ~2–4 weeks.**

- Scaffold the repo layout from Chapter 4 §2 (`framework/ ecs/ world/ scene/ assets/ rendering/ animation/ streaming/ physics/ audio/ input/ scripting/ networking/ ui/ utilities/ diagnostics/ editor/ resources/ game/`) even for directories that stay empty for months — it enforces the dependency-flow rule (Ch. 4 §3) from day one via lint/CI rather than convention.
- TypeScript project setup, module boundaries enforced (e.g. dependency-cruiser or a custom ESLint rule that fails the build on an upward import).
- CI pipeline skeleton: build, typecheck, unit test, lint — this becomes the foundation Phase 20's Build Automation (Ch. 21 in Deployment chapter) extends later, so don't rebuild it twice.
- Write down the "Architecture Before Implementation" workflow (Ch. 3 §4.1: propose → review → freeze → implement → integration review → merge) as an actual lightweight RFC template, even if you're a team of one — it's what turns "design philosophy" into something you actually follow under deadline pressure.

**Exit criteria:** empty engine boots, CI is green, module-boundary violations fail the build automatically.

---

## 3. Phase 1 — Framework Core + Diagnostics Bootstrap
**~3–5 weeks.**

Build only what Chapter 4 §4 assigns to Framework: app startup/shutdown, main loop, frame lifecycle, service registration, event dispatch, scheduler integration — plus a minimal slice of the Diagnostics Framework (Ch. 24) bootstrapped *now*, not deferred to Phase 20.

Why diagnostics this early, out of document order: almost every later chapter (Asset System, Streaming, HAOS, Deployment) assumes structured logging/metrics already exist and just hooks into them. Building it last means retrofitting instrumentation into 20 finished subsystems instead of building 20 subsystems that were observable from day one.

**Exit criteria:** a service can register with the framework, the main loop ticks at a stable frame rate, and a basic log/metrics stream is visible in a dev console.

---

## 4. Phase 2 — ECS Core
**~3–4 weeks.**

Implement entities/components/systems per Chapter 7: sparse-set storage, contiguous component arrays, system scheduling. Keep it strictly ignorant of rendering, audio, UI, and networking, exactly as Chapter 4 §5 mandates — that discipline is what makes Phase 19 (networking) tractable later, since the EDD's own justification for ECS is component-level replication.

**Exit criteria:** you can create/destroy thousands of entities, attach components, and run a system over them with measurable, stable frame time.

---

## 5. Phase 3 — World System + Matrix Spatial Pipeline
**~4–6 weeks. This is the architectural crux of the whole engine.**

Per Chapter 6: `Transform.js`, `SectorID`, `CellID`, local/sector/world coordinate transforms, and a world hierarchy that is deliberately *not* the Three.js scene graph. Get this wrong and every downstream system (rendering, physics, AI, streaming, save) inherits the mistake, since they all consume this layer.

**Exit criteria:** you can place, query, and transform objects across sector boundaries with correct coordinate math, with zero dependency on any renderer.

---

## 6. Phase 4 — Scene Runtime (D013)
**~2–3 weeks.**

Chapter 4 §8 scopes this precisely: scene lifecycle, transitions, active camera, environment, scene load/unload — orchestration, not simulation ownership. The EDD notes this was historically one of the first fully-merged subsystems in the project's own narrative, which lines up with putting it early here: it's the thin coordination layer everything above World needs before Assets and Rendering have anywhere to plug in.

**Exit criteria:** you can load/unload a scene, switch active camera, and tear down cleanly without leaks.

---

## 7. Phase 5 — Asset System + Import Pipeline
**~5–7 weeks.**

Chapter 9's separation is the important part to preserve, not skip for speed: `AssetRegistry` (metadata) / `AssetCache` (loaded resources) / `AssetLoader` (loading) / `AssetManager` (coordination), plus specialised loaders (Texture, Model, Shader, Audio, Video, Material, Font). Pair with the Import Pipeline (Ch. 10) so raw content can flow into engine-ready descriptors without hand-editing.

**Exit criteria:** a texture and a model can be requested by handle, loaded asynchronously, reference-counted, and evicted — with the Diagnostics layer from Phase 1 showing load times and cache hit rates.

---

## 8. Phase 6 — Minimal Rendering
**~5–7 weeks for a first working renderer; ongoing after that.**

Only now does Three.js integration begin, and strictly as described in Chapter 6: a *consumer* of World data, not its owner. Start with the smallest useful slice — camera, basic PBR material, one light type, frustum-culled draw calls sourced from World queries. Don't build "modern lighting techniques" (Ch. 8) yet; that's iteration, not foundation.

**Exit criteria:** the World System's contents render correctly and stay in sync as entities move, with rendering code containing zero authoritative world-state.

---

## 9. Phase 7 — Input System
**~2 weeks.**

Chapter 22's device abstraction, kept deliberately small at this stage (keyboard/mouse, one gamepad profile). This is what turns a rendered world into something a person can actually stand in and move through.

---

### ── Milestone A: "Grey-box playable" ──
A single test level: framework running, ECS-driven entities, correct spatial math, assets loading, basic rendering, and player input — walkable, first-person, no gameplay yet. This is the first point where the "engine and game co-evolve" philosophy from Chapter 1 can start operating for real: from here on, build features because *Echoes of Tomorrow* needs them, not because the document lists them.

---

## 10. Phases 8–15 — Systems Layer (parallelizable if team size allows)

These can run roughly in parallel once Milestone A lands, because they're mostly siblings in the dependency graph rather than a strict chain — but sequence them by what your first real gameplay scenario actually needs:

| Phase | System | Chapter | Notes |
|---|---|---|---|
| 8 | Physics & Collision | 15 | Needed before AI navigation and before any real gameplay feel |
| 9 | Animation + VAT pipeline | 12 | High-value but genuinely hard; start with CPU skeletal fallback, add VAT baking once you have >1 animated character type to justify it |
| 10 | Audio System | 17 | Environmental acoustics can wait; basic spatial audio can't |
| 11 | AI & Navigation | 16 | Depends on Physics (Ch. 15) and World (Ch. 6) both being stable |
| 12 | Streaming & World Partition | 14 | Only becomes urgent once your test level exceeds trivial size — don't over-build this before you have a world big enough to need it |
| 13 | Scripting & Gameplay Framework | 19 | This is where "Echoes of Tomorrow"-specific logic starts living, separate from engine code |
| 14 | UI/UX Framework | 21 | HUD and menus needed for anything beyond a tech demo |
| 15 | Persistence & Save System | 23 | Build once your world/entity schemas have stabilized — building it earlier means constant migration churn |

**Guardrail:** resist the pull to gold-plate any one of these before the others exist. A common failure mode on projects like this is polishing VAT animation or HAOS for months while the game has no save system, no AI, and no UI — leaving nothing playable end-to-end.

---

### ── Milestone B: "Vertical slice" ──
One real level of *Echoes of Tomorrow*, playable start to finish: physics-driven movement, animated enemies/NPCs, spatial audio, basic AI behavior, a save/load cycle, and real UI. This is the milestone that validates the entire architecture under Chapter 1's "real-world validation" principle — if something in the World/ECS/Asset foundation is wrong, it surfaces here, while it's still cheap to fix.

---

## 11. Phase 16 — HAOS (Hardware-Adaptive Optimization)
**~4–6 weeks, and only after Milestone B.**

Chapter 13's hardware-adaptive system needs real workload data to tune against — CPU/GPU/RAM profiles from an actual playable slice, not theoretical budgets. Building HAOS before you have a vertical slice to profile means guessing at thresholds you'll have to redo anyway.

---

## 12. Phase 17 — Editor & Developer Toolchain
**~6–10 weeks, can start once World/Asset/Scene are stable (i.e., can begin in parallel with Phase 8–15, but finishing it is only worth prioritizing once content production is about to scale).**

Chapter 20's tooling pays for itself the moment you have more than one person building levels, or more content than fits in hand-written data files. If you're solo through Milestone B, a minimal in-engine debug UI is enough; invest in the full editor once content production (Phase 18) is about to begin in earnest.

---

### ── Milestone C: "Content-ready pipeline" ──
HAOS is tuning quality automatically across at least two different hardware tiers, and the editor/toolchain is good enough that adding a new level doesn't require touching engine code.

---

## 13. Phase 18 — Full Content Production
This is where most of the remaining calendar time goes for *Echoes of Tomorrow* specifically — level design, narrative content, the "cyberpunk + Indian cultural identity" world-building called out in Chapter 1, enemy/NPC variety, audio content, localization data (Ch. 25 §15). Engine work becomes reactive from here: fix what content production reveals as broken or missing, rather than driving new architecture speculatively.

---

## 14. Phase 19 — Networking & Multiplayer *(conditional)*
Chapter 18 is explicitly framed elsewhere in the EDD as "future" work, and Chapter 7 notes the ECS's component-level design supports it *when needed*. Don't build this unless *Echoes of Tomorrow*'s actual design calls for multiplayer — if it's single-player, skip straight to Phase 20 and let Forge Engine inherit this as a later, generalized feature instead.

---

## 15. Phase 20 — Security, Packaging & Deployment
**~4–6 weeks.**

Chapter 25's VFS, package manifests, integrity verification, patch system, platform abstraction. This is late by design: packaging architecture is easiest to get right once you know what's actually shipping, and it reuses the CI foundation from Phase 0 rather than inventing a parallel pipeline.

---

### ── Milestone D: "Shippable" ──
A verified, patchable, platform-packaged build of *Echoes of Tomorrow* that a player outside the dev team can install and run.

---

## 16. Phase 21 — Forge Engine Extraction
Only after Echo Engine has actually shipped a game (Ch. 1 §2, "Only after the engine matures through real-world use..."). Extraction work: identify which parts of World/ECS/Asset/Rendering are genuinely game-agnostic versus load-bearing assumptions specific to *Echoes of Tomorrow*, and split accordingly. Doing this earlier means generalizing against guesses instead of evidence — exactly what Chapter 1 warns against.

---

## 17. Risk Register

| Risk | Where it bites | Mitigation |
|---|---|---|
| Scope creep via document-order building | Any phase | Always ask "does the current vertical slice need this" before extending a subsystem past its milestone's exit criteria |
| Over-engineering HAOS/VAT before there's data | Phase 9, 16 | Both are explicitly sequenced after a playable milestone in this roadmap for that reason |
| Rendering re-absorbing world ownership | Phase 6 onward | Enforce via the Phase 0 lint rule — no upward imports from `rendering/` into `world/` |
| Small team, 25-chapter scope | Whole project | Track against milestones (A–D), not chapters; a milestone slipping is real signal, a chapter being "incomplete" is expected at almost every point before Phase 18 |
| Save/serialization churn | Phase 15 | Deliberately deferred until schemas stabilize post-Milestone A |
| Editor investment before it's needed | Phase 17 | Minimal debug tooling until content production actually demands more |

---

## 18. Rough Timeline (order-of-magnitude, not a commitment)

Assuming the "architecture-first, review-driven" process in Chapter 3 is followed rather than skipped under pressure:

- **Solo developer:** Milestone A ≈ 4–6 months · Milestone B ≈ 10–14 months · Milestone D (shippable, modest-scope game) ≈ 2.5–4 years
- **Small team (4–6, mixed engine/gameplay):** Milestone A ≈ 2–3 months · Milestone B ≈ 5–7 months · Milestone D ≈ 12–20 months

These ranges assume Phase 18 (content) is scoped to a real, bounded game rather than an open-ended AAA world — the single biggest lever on total timeline is how large *Echoes of Tomorrow*'s actual content scope ends up being, which is a game-design decision, not an engine one.

---

*This roadmap sequences the EDD's existing 25 chapters by dependency and playability rather than proposing new architecture. Chapter/section references throughout point back to the source document for the authoritative technical detail.*
