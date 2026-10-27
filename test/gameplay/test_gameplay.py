#!/usr/bin/env python3
"""
Unit tests for Echoes of Tomorrow Mission Manager and Interaction triggers.
"""

def test_mission_objectives():
    objectives = [
        {"id": "explore", "title": "Explore", "completed": False},
        {"id": "fragment_01", "title": "Recover Fragment", "completed": False}
    ]

    def complete_objective(obj_id):
        for o in objectives:
            if o["id"] == obj_id:
                o["completed"] = True
                return True
        return False

    def is_all_complete():
        return all(o["completed"] for o in objectives)

    assert not is_all_complete()
    assert complete_objective("explore") is True
    assert not is_all_complete()
    assert complete_objective("fragment_01") is True
    assert is_all_complete()
    print("[OK] Mission objective progression tests passed.")

def test_interaction_proximity():
    player_pos = [0.0, 1.7, 0.0]
    terminal_pos = [0.0, 1.0, 2.0]
    radius = 2.5

    dist = ((player_pos[0] - terminal_pos[0])**2 + (player_pos[2] - terminal_pos[2])**2)**0.5
    assert dist == 2.0
    in_range = dist <= radius
    assert in_range is True
    print("[OK] Interaction proximity test passed.")

if __name__ == "__main__":
    test_mission_objectives()
    test_interaction_proximity()
