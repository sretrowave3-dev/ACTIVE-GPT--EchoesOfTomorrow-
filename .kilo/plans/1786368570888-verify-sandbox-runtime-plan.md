# Plan: Restore EchoSandbox Runtime and Verify Engine Boot

## TL;DR
EchoSandbox cannot currently boot because `src/` contains 15 files with unresolved git merge conflict markers, 1 missing module (`StreamingJob.js`), and multiple wrong ES module import paths for ID classes. Additionally, `SandboxBootstrap` omits the `FrameScheduler` phase setup, and the EchoSandbox UI layer has destructive stubs that wipe DOM content. This plan fixes all blocking issues, then verifies the sandbox runtime boots and the debug overlay shows time diagnostics.

## Verified Facts

- `src/world/CellID.js`, `src/world/SectorID.js`, `src/world/RegionID.js`, `src/world/EntityID.js` all exist and export their respective classes.
- `src/framework/core/Bootstrap.js:12-34` is the authoritative reference for FrameScheduler phase setup.
- `SandboxBootstrap._stepServices()` currently lacks all FrameScheduler configuration.
- UI stubs in `EchoSandbox/ui/` overwrite parent container `textContent`, destroying the HTML defined in `EchoSandbox/index.html`. `Dashboard` targets `#sandboxLayout` and will wipe the sidebar, viewport, and inspector including both `<canvas>` elements.
- All other EchoSandbox-internal imports (`ui/*.js`, `monitors/*.js`, `adapters/*.js`, `core/*.js`) resolve correctly.

## Step 1 — Resolve merge conflicts and fix import paths in `src/` (BLOCKING)

15 files have unresolved git conflict markers. Several also import `CellID`/`SectorID`/`RegionID`/`EntityID` using wrong relative paths (`../CellID.js` instead of `../world/CellID.js`).

### 1a. Create missing module
- **Create** `src/streaming/StreamingJob.js`:
  ```js
  export class StreamingJob {
    constructor() { this.done = false; }
    execute(world) { throw new Error('StreamingJob.execute() must be implemented by subclass'); }
  }
  ```

### 1b. Resolve merge conflicts (keep one clean copy, remove all `<<<<<<<`, `=======`, `>>>>>>>` markers)
Files to fix:
- `src/world/Transform.js`
- `src/world/SectorID.js`
- `src/world/RegionID.js`
- `src/world/CellID.js`
- `src/registries/SectorRegistry.js`
- `src/registries/RegionRegistry.js`
- `src/registries/EntityRegistry.js`
- `src/registries/CellRegistry.js`
- `src/queries/RadiusQuery.js`
- `src/spatial/GridPartition.js`
- `src/streaming/SectorUnloader.js`
- `src/streaming/SectorLoader.js`
- `src/framework/diagnostics/PerformanceCounters.js`
- `src/rendering/PBRTextureGenerator.js`
- `src/rendering/EnvironmentSetup.js`

Where both sides are identical: keep one copy, drop markers.
Where sides differ: prefer the side whose imports use correct paths (see 1c).

### 1c. Fix wrong ID import paths in the above files (and any other `src/` file importing IDs from the wrong depth)
| File(s) | Wrong import | Correct import |
|---|---|---|
| `src/registries/RegionRegistry.js` | `../RegionID.js` | `../world/RegionID.js` |
| `src/registries/SectorRegistry.js` | `../SectorID.js` | `../world/SectorID.js` |
| `src/registries/CellRegistry.js` | `../CellID.js` | `../world/CellID.js` |
| `src/registries/EntityRegistry.js` | `../EntityID.js` | `../world/EntityID.js` |
| `src/managers/WorldGraph.js` | `../RegionID.js`, `../SectorID.js`, `../CellID.js` | `../world/...` |
| `src/queries/RadiusQuery.js` | `../CellID.js` | `../world/CellID.js` |
| `src/streaming/SectorLoader.js` | `../CellID.js` | `../world/CellID.js` |
| `src/streaming/SectorUnloader.js` | `../CellID.js` | `../world/CellID.js` |

**Rule**: if a file in `src/registries/`, `src/queries/`, `src/managers/`, or `src/streaming/` imports one of the four ID classes, the relative path MUST be `../world/<IdName>.js`.

### Validation after Step 1
```bash
# Must return ZERO matches
grep -r "<<<<<<<" src/
```
Also spot-check that `src/registries/CellRegistry.js` resolves to `../world/CellID.js`.

## Step 2 — Fix FrameScheduler setup in `EchoSandbox/core/SandboxBootstrap.js`

In `_stepServices()` (currently lines 106-127), insert FrameScheduler phase configuration **after** service registration and **before** `initializeAll()`:

```js
// Configure FrameScheduler phases (mirrors src/framework/core/Bootstrap.js)
const scheduler = this.framework.frameScheduler;

scheduler.addPhase('events');
scheduler.addPhase('input');
scheduler.addPhase('streaming');
scheduler.addPhase('world');
scheduler.addPhase('time');
scheduler.addPhase('ecs');
scheduler.addPhase('ai');
scheduler.addPhase('gameplay');
scheduler.addPhase('animation');
scheduler.addPhase('audio');
scheduler.addPhase('rendering');
scheduler.addPhase('ui');
scheduler.addPhase('diagnostics');

scheduler.addServiceToPhase('input', this.framework.serviceRegistry.get('input'));
scheduler.addServiceToPhase('world', this.framework.serviceRegistry.get('world'));
scheduler.addServiceToPhase('time', this.framework.serviceRegistry.get('time'));
scheduler.addServiceToPhase('ecs', this.framework.serviceRegistry.get('ecs'));
scheduler.addServiceToPhase('gameplay', this.framework.serviceRegistry.get('player'));
scheduler.addServiceToPhase('audio', this.framework.serviceRegistry.get('audio'));
scheduler.addServiceToPhase('rendering', this.framework.serviceRegistry.get('render'));
scheduler.addServiceToPhase('ui', this.framework.serviceRegistry.get('ui'));

// Then call initializeAll() as before
await this.framework.serviceRegistry.initializeAll();
```

This matches `src/framework/core/Bootstrap.js:12-34` exactly.

## Step 3 — Fix destructive UI stubs in `EchoSandbox/ui/`

Several UI component constructors call `this.container.textContent = '...'`, which destroys child elements defined in `EchoSandbox/index.html`. Fix each to **only observe state**, never wipe the container.

### 3a. `EchoSandbox/ui/Dashboard.js` (CRITICAL)
- Targets `#sandboxLayout`, which holds the sidebar + viewport + inspector. Setting `textContent` destroys the canvas elements (`viewportCanvas`, `debugOverlayCanvas`), breaking DebugOverlay.
- Fix: make `_init()` a no-op or subscribe to `state` and do nothing destructive. The layout is already fully defined in HTML.

### 3b. `EchoSandbox/ui/Toolbar.js`
- Targets `#toolbar`. Setting `textContent` wipes play/step/reload buttons and FPS/memory displays.
- Fix: `_init()` should wire button click handlers instead of wiping content. At minimum, make it a no-op.

### 3c. `EchoSandbox/ui/Sidebar.js`
- Targets `#sidebar`. Setting `textContent` wipes the module list.
- Fix: make `_init()` a no-op or add click handling on `.module-item` elements without wiping.

### 3d. `EchoSandbox/ui/InspectorPanel.js`
- Targets `#inspectorContent`. Overwrites "Select a module to inspect".
- Fix: observe `state.selectedModule` and render module details instead of wiping.

### 3e. `EchoSandbox/ui/StatisticsPanel.js`
- Targets `#statGrid`. Overwrites with "Statistics ready".
- Fix: observe `state.stats` and render stat rows into the grid.

### 3f. `EchoSandbox/ui/ConsolePanel.js`
- Targets `#consoleOutput`. Overwrites "[Sandbox] Ready".
- Fix: subscribe to `state` console/log entries and append them instead of wiping.

### 3g. `EchoSandbox/ui/Viewport.js` and `StatusBar.js`
- Already benign (clear canvas / set status text). No change needed.

## Step 4 — Update `package.json`

Current scripts:
```json
"scripts": {
  "start": "node src/main.js",
  "sandbox": "npx http-server . -p 8080"
}
```

Change to:
```json
"scripts": {
  "start": "npx serve EchoSandbox",
  "sandbox": "npx serve EchoSandbox"
}
```

This makes `npm start` launch the browser sandbox directly.

## Step 5 — Verify the runtime

1. Serve: `npx serve EchoSandbox` (or the updated `npm start`)
2. Open browser to the served address + `/index.html`
3. Open DevTools → Console
4. Verify:
   - Zero fatal module-load errors
   - Startup overlay completes and disappears
   - Main sandbox UI remains visible (toolbar, sidebar, viewport, inspector, bottom panel)
   - Debug overlay canvas renders with updating FPS, frame count, and time diagnostics (queue size, dependencies, simulation time)
   - Console tab shows successful initialization logs

## Files Changed

- `src/streaming/StreamingJob.js` — **created**
- `src/world/Transform.js` — resolve conflicts
- `src/world/SectorID.js` — resolve conflicts
- `src/world/RegionID.js` — resolve conflicts
- `src/world/CellID.js` — resolve conflicts
- `src/registries/SectorRegistry.js` — resolve conflicts + fix path
- `src/registries/RegionRegistry.js` — resolve conflicts + fix path
- `src/registries/EntityRegistry.js` — resolve conflicts + fix path
- `src/registries/CellRegistry.js` — resolve conflicts (keep HEAD correct path)
- `src/queries/RadiusQuery.js` — resolve conflicts + fix path
- `src/spatial/GridPartition.js` — resolve conflicts
- `src/streaming/SectorUnloader.js` — resolve conflicts + fix path
- `src/streaming/SectorLoader.js` — resolve conflicts + fix path
- `src/framework/diagnostics/PerformanceCounters.js` — resolve conflicts
- `src/rendering/PBRTextureGenerator.js` — resolve conflicts
- `src/rendering/EnvironmentSetup.js` — resolve conflicts
- `EchoSandbox/core/SandboxBootstrap.js` — add FrameScheduler phases
- `EchoSandbox/ui/Dashboard.js` — remove destructive `textContent` assignment
- `EchoSandbox/ui/Toolbar.js` — remove destructive `textContent` assignment
- `EchoSandbox/ui/Sidebar.js` — remove destructive `textContent` assignment
- `EchoSandbox/ui/InspectorPanel.js` — remove destructive `textContent` assignment
- `EchoSandbox/ui/StatisticsPanel.js` — remove destructive `textContent` assignment
- `EchoSandbox/ui/ConsolePanel.js` — remove destructive `textContent` assignment
- `package.json` — update start/sandbox scripts

## Risks

- Merge conflict resolution may miss subtle logic differences between sides. Mitigation: all observed conflicts in the critical world/registry/streaming files have identical bodies; rendering/diagnostics conflicts are similarly low-risk.
- Some `src/` files not yet verified may also import IDs with wrong paths. Mitigation: after resolving the known 8 files, run `grep -r "from '../CellID.js'" src/` etc. to catch any remaining.
- UI stub fixes are minimal by design; deeper UI wiring is deferred to post-verification.
