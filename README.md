# Echoes of Tomorrow

**A first‑person, open‑world, story‑driven immersive simulation built on a custom AAA‑grade engine architecture.**

This repository contains the complete source code of the game **Echoes of Tomorrow** and the custom engine that powers it. The engine is **not** a generic reusable framework; it is specifically designed around the needs of the game. Over time, it will evolve into **Forge Engine**, a standalone, reusable foundation for future projects.

---

## Table of Contents

1. [Game Overview](#game-overview)  
2. [Engine Philosophy](#engine-philosophy)  
3. [High‑Level Architecture](#high-level-architecture)  
4. [Subsystem Deep Dive](#subsystem-deep-dive)  
   - [Framework](#framework)  
   - [Time System](#time-system)  
   - [World System](#world-system)  
   - [Entity Component System (ECS)](#entity-component-system-ecs)  
   - [Streaming](#streaming)  
   - [Rendering](#rendering)  
   - [Input, Audio, and Other Services](#input-audio-and-other-services)  
5. [Performance](#performance)  
6. [Coding Standards](#coding-standards)  
7. [Project Goals](#project-goals)  
8. [Roadmap](#roadmap)  
9. [Development Philosophy](#development-philosophy)  
10. [Contributing](#contributing)  
11. [License](#license)

---

## Game Overview

**Echoes of Tomorrow** is a narrative‑driven, first‑person shooter set in a massive, post‑war Indian megacity. The game blends military authenticity, psychological tension, and open‑world simulation into a seamless experience. The player assumes the role of Captain Arjun Rao, navigating a world that shifts between reality and corrupted memory.

**Core inspirations:** Metro, STALKER, Battlefield, Escape from Tarkov, Far Cry, Half‑Life, Dying Light.  
**Not** a clone – the goal is to combine the strongest aspects of these titles into a unique, cohesive vision.

**World:** A sprawling Indian metropolis merging classical architecture with cyberpunk verticality, military occupation, abandoned infrastructure, and nature reclaiming civilization. The world is divided into a hierarchy of **Regions → Sectors → Cells** to enable seamless streaming and simulation at scale.

---

## Engine Philosophy

The engine is built on a set of unwavering principles that guide every architectural decision:

- **Architecture First:** No code is written without a frozen design.  
- **Scalability:** Designed for 100 000+ entities, large streaming worlds, and future multiplayer.  
- **Deterministic Simulation:** Identical inputs produce identical outputs – essential for debugging, replay, and networking.  
- **Low Coupling, High Cohesion:** Every subsystem has a single responsibility and communicates through well‑defined interfaces.  
- **Composition over Inheritance:** Behaviour is built from components, not deep class hierarchies.  
- **Data‑Driven Design:** Simulation state is separate from presentation; rendering is a visualisation, not the source of truth.  
- **Service‑Based Architecture:** Major systems are implemented as Framework services, managed by a central `ServiceRegistry`.  
- **Long‑Term Maintainability:** Readability, stable APIs, and subsystem isolation trump immediate convenience.  
- **Performance before Convenience:** Hot paths avoid allocations, cache misses, and unnecessary work.  
- **Subsystem Freezing:** Once a module’s design is approved, it is frozen; changes require strong justification.

---

## High‑Level Architecture

```
                          Game Loop (requestAnimationFrame)
                                   │
                                   ▼
                          Framework (Boot, Clock, Scheduler)
                                   │
                         ┌─────────┼─────────┐
                         │         │         │
                    ServiceRegistry  EventBus  Diagnostics
                         │
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
    InputService    TimeService    WorldService    ECSService
         │               │               │               │
   PlayerController  WorldClock     World           ECSManager
                   SchedulerState   ├─Registries    ├─ComponentStores
                   EventScheduler   ├─WorldGraph    ├─Systems
                   DiagnosticsColl. ├─StreamingMgr  └─SystemScheduler
                                    └─SpatialManager
```

**Data Flow:**  
`Input` → `PlayerController` (reads input, updates camera/position) → `World` updates simulation state → `ECS` processes per‑frame logic (movement, health, etc.) → `Rendering` reads transform and mesh components to draw the scene.

**Ownership:**  
The `World` owns the spatial organisation of entities. The `ECS` owns the simulation data (components) and behaviour (systems). The `TimeManager` owns the passage of time and scheduled events. Rendering is a separate layer that visualises the current state without owning any game data.

**Communication:**  
All cross‑subsystem communication occurs via the `EventBus`. No system calls another directly. This keeps dependencies minimal and allows new features (like memory corruption) to be inserted as event listeners.

---

## Subsystem Deep Dive

### Framework

The Framework is the skeleton of the engine. It provides:

- **GameClock:** A single authoritative timing source, used by all subsystems.  
- **ServiceRegistry:** Registers and manages the lifecycle (`initialize`, `start`, `shutdown`) of every major service.  
- **FrameScheduler:** Executes a fixed, data‑driven sequence of phases every frame (`input` → `time` → `world` → `ecs` → `gameplay` → `rendering` → `ui`).  
- **EventBus:** A publish/subscribe system with queued, per‑frame dispatch. Events are immutable and carry a `type`, `sender`, and `payload`.  
- **GameStateMachine:** Controls high‑level states (`Boot`, `MainMenu`, `Playing`, `Paused`, `Cutscene`, `Shutdown`) and validates transitions.  
- **DiagnosticsService:** Collects FPS, frame times, and event queue sizes, publishing them via the EventBus.

The Framework owns the game loop and enforces a strict update order. It is the only module that knows about `requestAnimationFrame`; no other subsystem uses raw browser timers.

### Time System

The Time System is responsible for the simulation clock and scheduled events. It is the heartbeat of the living world.

**Components:**  
- `WorldClock` – authoritative simulation time, pausing, and time scaling.  
- `SchedulerState` – owns all scheduled events, the `ReadyQueue`, and the `DependencyGraph`.  
- `EventScheduler` – processes ready events each frame, validates and dispatches them, and resolves dependencies.  
- `SectorSchedulerState` – per‑sector snapshot of `SchedulerState` for unloaded areas.  
- `TimeSerializer` – saves and restores the entire time state without accessing internal data of other modules.  
- `DiagnosticsCollector` – tracks registered, executed, cancelled, and failed events.  

**Design Highlights:**  
- Events are ordered deterministically: `fireTime` → `priority` → `sequenceNumber`.  
- Dependencies are handled by a `DependencyGraph`; blocked events never enter the `ReadyQueue`.  
- Time jumps (sleeping, waiting) are explicit and process all intermediate events in a tight loop.  
- Sectors that are unloaded retain their scheduled events; they are fast‑forwarded when the sector reloads.  
- Serialization is delegated to each module; `TimeSerializer` merely orchestrates.

### World System

The World System provides the spatial and hierarchical organisation of all entities. It is a pure simulation layer – it knows nothing about rendering, AI, or gameplay.

**Hierarchy:**  
```
World
 └─ Region (major playable area)
      └─ Sector (streaming unit)
           └─ Cell (spatial partition)
                └─ Entity (via ID references)
```

**Key Managers:**  
- `WorldGraph` – creates and maintains the region/sector/cell hierarchy.  
- `EntityManager` – handles entity creation, destruction, and lifecycle (state transitions are external).  
- `SpatialManager` – maps world positions to cells via a uniform grid (`GridPartition`).  
- `StreamingManager` – loads and unloads sectors on demand; loads are processed by `SectorLoader` jobs, unloads by `SectorUnloader` jobs.  
- `QueryManager` – exposes `queryRadius`, `queryNearest`, and `queryCell` using the spatial index.  

**Registries:**  
`RegionRegistry`, `SectorRegistry`, `CellRegistry`, `EntityRegistry` are pure storage containers (Maps) with O(1) lookup. They never construct objects.

**IDs and Handles:**  
Every entity is identified by an `EntityID` (numeric + generation). External code holds `EntityHandle` objects that become invalid when the entity is destroyed.

**Streaming:**  
Sectors are loaded/unloaded without freezing gameplay. Unloaded sectors store their entities and scheduled events; when reloaded, they are fast‑forwarded to the current world time.

### Entity Component System (ECS)

The ECS is the simulation backbone. Entities are pure identities; components are pure data; systems contain behaviour. This separation enables cache‑friendly iteration, clear responsibilities, and easy integration of new features.

**Core Concepts:**  
- **Entity** – an `EntityID`, a `Signature` (bitmask), and active flags. No data.  
- **Component** – plain data containers (`Transform`, `Velocity`, `Health`, `Mesh`, `Audio`, etc.). No logic.  
- **System** – reads component data, performs updates, writes results. Systems only know about their required components.  

**Storage:**  
Components are stored in `ComponentStore<T>`, backed by a `SparseSet`. Each component type has its own store, providing O(1) add/remove/lookup and cache‑friendly iteration.

**Entity Signature:**  
A 128‑bit mask tracks which components an entity possesses. Systems define a `requiredSignature()`; the scheduler automatically collects matching entities before calling `system.update()`.

**SystemScheduler:**  
Runs systems in a configurable order (`Input` → `Movement` → `Health` → `Animation` → …). Each system receives the delta time and an array of matching entity IDs.

**Why ECS?**  
Compared to deep inheritance trees, ECS offers:
- Better performance through data locality.
- Easier composition of behaviour (e.g., adding a `Flammable` component to any entity).
- Simplified serialisation and networking.
- Clean separation between data and logic.

### Streaming

World streaming is sector‑based. As the player moves, sectors in range are loaded, and distant sectors are unloaded.

**Process:**  
1. `StreamingManager` receives sector load/unload requests (driven by player position or events).  
2. `SectorLoader` creates cells, registers them in the spatial index, and instantiates static entities.  
3. `SectorUnloader` removes cells, unregisters entities, and stores any pending scheduled events in a `SectorSchedulerState`.  
4. Loading is currently synchronous but designed to be easily split into asynchronous chunks (using `StreamingJob` base class).  

**Future:**  
- Asynchronous loading via Web Workers.  
- Priority‑based streaming budgets.  
- Preloading hints from mission logic.

### Rendering

Rendering is a separate service that reads the `Transform` and `Mesh` components from the ECS and draws the scene using Three.js (currently) or a future custom renderer. The renderer never owns game state; it is purely a visualisation layer.

**Current capabilities:**  
- PBR materials with albedo, roughness, metalness, and normal maps.  
- Shadow mapping (PCF soft shadows).  
- ACES filmic tone mapping with exposure control.  
- Exponential fog for atmospheric depth.

**Planned:**  
- Custom shader pipeline.  
- Post‑processing stack.  
- Reflection probes and global illumination approximations.  
- Level‑of‑detail (LOD) system driven by ECS components.

### Input, Audio, and Other Services

All peripheral systems are implemented as Framework services:

- **InputService** – captures keyboard and mouse state, including pointer lock for first‑person controls.  
- **AudioService** – placeholder for spatial audio.  
- **UIService** – handles menus and HUD.  
- **PlayerService** – wires together input, camera, and player movement logic.  

These services communicate exclusively through the EventBus.

---

## Performance

The engine is designed for stable, predictable performance on modern browsers.

**Key strategies:**  
- **Cache‑friendly data structures:** `SparseSet` component storage, contiguous arrays for entity iteration.  
- **Minimal per‑frame allocations:** Reused temporary arrays, pooled events where possible.  
- **Streaming:** Only active sectors are simulated; distant entities are sleeping.  
- **Deterministic update order:** Prevents unexpected spikes from unordered processing.  
- **Profiling‑first approach:** Optimisation is done only after measurement; no premature micro‑optimisations.

Target: 100 000+ dynamic entities, tens of thousands of components, 60 FPS on mid‑range hardware.

---

## Coding Standards

All code follows a strict set of rules designed to maximise long‑term maintainability.

- **ES2023 modules** – no global scripts.  
- **JSDoc** on every public class and method.  
- **Single Responsibility Principle** – each class does one thing.  
- **Composition over Inheritance** – shared behaviour via components, not base classes.  
- **No global state, no singletons** – state is owned by specific objects.  
- **No circular dependencies** – the dependency graph is a DAG.  
- **No magic numbers or strings** – use constants and enums.  
- **Clear ownership** – every piece of data has exactly one owner.  
- **Freeze architecture before coding** – design documents precede implementation.  
- **Code reviews are mandatory** – no merge without review.

---

## Project Goals

**Near‑term (current milestone):**  
- Complete the World System, ECS, and Time System integration.  
- Implement basic player movement and interaction.  
- Establish the rendering pipeline with PBR environment.

**Mid‑term:**  
- NPC daily schedules and world population simulation.  
- AI behaviour trees and perception.  
- Combat system (ballistics, damage, inventory).  
- Mission and dialogue systems.  
- Full save/load support.

**Long‑term:**  
- Dynamic weather, traffic, and economy.  
- Memory corruption mechanics (signature game feature).  
- Multiplayer support.  
- Editor and tooling suite.  
- Extract the engine into **Forge Engine** as a standalone, reusable platform.

---

## Roadmap

| System           | Status        |
| ---------------- | ------------- |
| Framework        | ✅ Complete    |
| Time System      | ✅ Complete    |
| World System     | 🚧 In Progress |
| ECS              | 🚧 In Progress |
| Rendering        | 🚧 In Progress |
| Animation        | 📋 Planned     |
| Physics          | 📋 Planned     |
| Audio            | 📋 Planned     |
| AI               | 📋 Planned     |
| Networking       | 📋 Future      |
| Editor           | 📋 Future      |
| Asset Pipeline   | 📋 Future      |
| Optimisation     | 🔄 Continuous  |
| Documentation    | 🔄 Continuous  |

---

## Development Philosophy

This project is built with a professional, long‑term mindset. Every feature starts as a design document, is reviewed, frozen, and then implemented. Subsystems are isolated and testable. Technical debt is minimised by strict adherence to architectural principles and rigorous code review.

**Workflow:**  
1. Architecture design → review → freeze.  
2. Implementation module‑by‑module.  
3. Code review → merge.  
4. Integration tests.  
5. Move to next subsystem.

No feature is merged until it meets the acceptance criteria defined in its architecture document.

---

## Contributing

Contributions must follow the established architecture and coding standards.

**Requirements:**  
- Discuss major changes through an issue or design document first.  
- PRs must be focused, with a clear description.  
- All public APIs require JSDoc.  
- New subsystems must follow the service pattern and communicate via EventBus.  
- Performance‑sensitive code must include benchmarks.  
- Any change that modifies a frozen architecture requires a formal review.

**Naming conventions:**  
- Classes: `PascalCase`.  
- Methods and variables: `camelCase`.  
- Private members: underscore prefix `_privateMethod`.  
- Constants: `UPPER_SNAKE_CASE`.

---

## License

[License placeholder – to be defined]

---

*Echoes of Tomorrow – Engine and Game. Built for the long run.*
