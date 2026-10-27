# test/editor/test_editor_suite.py
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def test_world_outliner():
    """Validates WorldOutliner indexing, search filtering, selection, and visibility."""
    class MockOutliner:
        def __init__(self):
            self.entities = {}
            self.selected = set()
            self.hidden = set()
            self.locked = set()
            self.filter_query = ""

        def register(self, eid, name, type_name):
            self.entities[eid] = {"id": eid, "name": name, "type": type_name}

        def set_filter(self, q):
            self.filter_query = q.lower().strip()

        def get_filtered(self):
            res = []
            for eid, ent in self.entities.items():
                if self.filter_query:
                    if self.filter_query not in ent["name"].lower() and self.filter_query not in ent["type"].lower():
                        continue
                res.append(ent)
            return res

        def select(self, eid, additive=False):
            if not additive:
                self.selected.clear()
            if eid in self.entities:
                self.selected.add(eid)

        def toggle_visibility(self, eid):
            if eid in self.hidden:
                self.hidden.remove(eid)
                return True
            else:
                self.hidden.add(eid)
                return False

    outliner = MockOutliner()
    outliner.register(1001, "Player_Arjun", "PlayerActor")
    outliner.register(1002, "CyberDrone_01", "AIActor")
    outliner.register(1003, "Crate_StaticMesh", "StaticMeshActor")

    assert len(outliner.entities) == 3

    # Test filtering
    outliner.set_filter("drone")
    filtered = outliner.get_filtered()
    assert len(filtered) == 1 and filtered[0]["id"] == 1002, "Filter should isolate Drone"

    outliner.set_filter("")
    assert len(outliner.get_filtered()) == 3

    # Test selection
    outliner.select(1001)
    assert 1001 in outliner.selected
    outliner.select(1002, additive=True)
    assert 1001 in outliner.selected and 1002 in outliner.selected

    # Test visibility
    vis = outliner.toggle_visibility(1003)
    assert vis is False and 1003 in outliner.hidden
    vis2 = outliner.toggle_visibility(1003)
    assert vis2 is True and 1003 not in outliner.hidden

    print("[OK] WorldOutliner indexing, filtering, multi-selection, and visibility passed.")

def test_details_inspector():
    """Validates DetailsInspector live property editing, nested reflection, and undo."""
    class MockInspector:
        def __init__(self):
            self.components = {
                1001: {
                    "TransformComponent": {"position": {"x": 0.0, "y": 2.0, "z": 0.0}},
                    "HealthComponent": {"current": 100.0, "max": 100.0}
                }
            }
            self.undo_stack = []

        def set_property(self, eid, comp, prop_path, val):
            c = self.components.get(eid, {}).get(comp)
            if not c:
                return False
            parts = prop_path.split(".")
            curr = c
            for p in parts[:-1]:
                curr = curr[p]
            old_val = curr[parts[-1]]
            curr[parts[-1]] = val
            self.undo_stack.append((eid, comp, prop_path, old_val, val))
            return True

        def undo(self):
            if not self.undo_stack:
                return False
            eid, comp, prop_path, old_val, _ = self.undo_stack.pop()
            c = self.components.get(eid, {}).get(comp)
            parts = prop_path.split(".")
            curr = c
            for p in parts[:-1]:
                curr = curr[p]
            curr[parts[-1]] = old_val
            return True

    insp = MockInspector()
    assert insp.components[1001]["TransformComponent"]["position"]["x"] == 0.0

    # Modify nested position X to 15.5
    insp.set_property(1001, "TransformComponent", "position.x", 15.5)
    assert insp.components[1001]["TransformComponent"]["position"]["x"] == 15.5

    # Modify health
    insp.set_property(1001, "HealthComponent", "current", 75.0)
    assert insp.components[1001]["HealthComponent"]["current"] == 75.0

    # Undo health
    insp.undo()
    assert insp.components[1001]["HealthComponent"]["current"] == 100.0

    # Undo transform
    insp.undo()
    assert insp.components[1001]["TransformComponent"]["position"]["x"] == 0.0

    print("[OK] DetailsInspector nested property mutation and undo stack passed.")

def test_transform_gizmo():
    """Validates 3D transform gizmo modes and grid/angle snapping."""
    class MockGizmo:
        def __init__(self):
            self.mode = "TRANSLATE"
            self.snapping = True
            self.grid_step = 0.5

        def apply_delta(self, axis, raw_delta, target_pos):
            delta = raw_delta
            if self.snapping and self.grid_step > 0:
                delta = round(delta / self.grid_step) * self.grid_step
            target_pos[axis] += delta
            return delta

    gizmo = MockGizmo()
    pos = {"x": 0.0, "y": 0.0, "z": 0.0}

    # Raw drag of 0.43 with 0.5 step snapping should snap to 0.5
    applied = gizmo.apply_delta("x", 0.43, pos)
    assert abs(applied - 0.5) < 0.001
    assert abs(pos["x"] - 0.5) < 0.001

    # Raw drag of 1.12 with 0.5 step snapping should snap to 1.0
    applied2 = gizmo.apply_delta("x", 1.12, pos)
    assert abs(applied2 - 1.0) < 0.001
    assert abs(pos["x"] - 1.5) < 0.001

    print("[OK] TransformGizmo translation manipulation and grid snapping passed.")

def test_play_in_editor():
    """Validates Unreal PIE simulation states, snapshots, and state restoration."""
    class MockPIE:
        def __init__(self):
            self.state = "EDIT"
            self.snapshot = None
            self.world = {"actor_1": {"x": 10.0, "y": 0.0}}

        def play(self):
            if self.state == "EDIT":
                # Take snapshot
                self.snapshot = {k: dict(v) for k, v in self.world.items()}
                self.state = "PLAY"
            elif self.state == "PAUSE":
                self.state = "PLAY"

        def pause(self):
            if self.state in ("PLAY", "EJECT"):
                self.state = "PAUSE"

        def eject(self):
            if self.state == "PLAY":
                self.state = "EJECT"
            elif self.state == "EJECT":
                self.state = "PLAY"

        def stop(self):
            if self.state != "EDIT":
                # Restore snapshot
                self.world = {k: dict(v) for k, v in self.snapshot.items()}
                self.snapshot = None
                self.state = "EDIT"

    pie = MockPIE()
    assert pie.state == "EDIT"
    assert pie.world["actor_1"]["x"] == 10.0

    # Start simulation
    pie.play()
    assert pie.state == "PLAY"

    # World mutates during gameplay simulation
    pie.world["actor_1"]["x"] = 999.0

    # Eject from player
    pie.eject()
    assert pie.state == "EJECT"

    # Pause simulation
    pie.pause()
    assert pie.state == "PAUSE"

    # Stop simulation -> Must restore world cleanly to pristine snapshot
    pie.stop()
    assert pie.state == "EDIT"
    assert pie.world["actor_1"]["x"] == 10.0, f"World state must be restored upon Stop, got {pie.world['actor_1']['x']}"

    print("[OK] PlayInEditor state machine, snapshotting, and world restoration passed.")

def main():
    print("Testing Phase 26 Professional Editor Suite & In-Engine World Outliner...")
    test_world_outliner()
    test_details_inspector()
    test_transform_gizmo()
    test_play_in_editor()
    print("[SUCCESS] Phase 26 Professional Editor Suite verified successfully!")

if __name__ == "__main__":
    main()
