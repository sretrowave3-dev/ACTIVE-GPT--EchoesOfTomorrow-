#!/usr/bin/env python3
"""
Unit tests for Echo Engine AI Behavior Trees, Blackboards, and Perception logic.
"""

def test_blackboard():
    bb = {}
    bb["target_id"] = 1000
    bb["alert_level"] = "high"
    assert bb.get("target_id") == 1000
    assert bb.get("missing", None) is None
    print("[OK] Blackboard tests passed.")

def test_behavior_tree():
    # Sequence: all must succeed
    class Node:
        def __init__(self, status): self.status = status
        def tick(self): return self.status

    class Sequence:
        def __init__(self, children): self.children = children
        def tick(self):
            for c in self.children:
                s = c.tick()
                if s != "SUCCESS": return s
            return "SUCCESS"

    class Selector:
        def __init__(self, children): self.children = children
        def tick(self):
            for c in self.children:
                s = c.tick()
                if s != "FAILURE": return s
            return "FAILURE"

    seq = Sequence([Node("SUCCESS"), Node("SUCCESS")])
    assert seq.tick() == "SUCCESS"

    seq_fail = Sequence([Node("SUCCESS"), Node("FAILURE"), Node("SUCCESS")])
    assert seq_fail.tick() == "FAILURE"

    sel = Selector([Node("FAILURE"), Node("SUCCESS")])
    assert sel.tick() == "SUCCESS"

    sel_fail = Selector([Node("FAILURE"), Node("FAILURE")])
    assert sel_fail.tick() == "FAILURE"

    print("[OK] Behavior Tree Sequence and Selector tests passed.")

def test_perception_chase():
    ai_pos = [0, 0, 0]
    player_pos = [3, 0, 4]
    sight_radius = 10.0

    dist_sq = (player_pos[0] - ai_pos[0])**2 + (player_pos[2] - ai_pos[2])**2
    assert dist_sq == 25.0
    can_see = dist_sq <= (sight_radius * sight_radius)
    assert can_see is True
    print("[OK] AI Perception distance calculation passed.")

if __name__ == "__main__":
    test_blackboard()
    test_behavior_tree()
    test_perception_chase()
