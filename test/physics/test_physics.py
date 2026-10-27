#!/usr/bin/env python3
"""
Unit tests for Echo Engine Physics & Collision algorithms.
"""

def test_aabb_overlap():
    # Box A: center (0, 0, 0), size (2, 2, 2) => min (-1, -1, -1), max (1, 1, 1)
    a_min = [-1.0, -1.0, -1.0]
    a_max = [1.0, 1.0, 1.0]

    # Box B: center (1.5, 0, 0), size (2, 2, 2) => min (0.5, -1, -1), max (2.5, 1, 1)
    b_min = [0.5, -1.0, -1.0]
    b_max = [2.5, 1.0, 1.0]

    # Intersect test
    intersects = not (
        a_max[0] < b_min[0] or a_min[0] > b_max[0] or
        a_max[1] < b_min[1] or a_min[1] > b_max[1] or
        a_max[2] < b_min[2] or a_min[2] > b_max[2]
    )
    assert intersects is True, "Box A and Box B should intersect on X axis"

    # Box C: center (5, 0, 0) => separated
    c_min = [4.0, -1.0, -1.0]
    c_max = [6.0, 1.0, 1.0]
    intersects_c = not (
        a_max[0] < c_min[0] or a_min[0] > c_max[0] or
        a_max[1] < c_min[1] or a_min[1] > c_max[1] or
        a_max[2] < c_min[2] or a_min[2] > c_max[2]
    )
    assert intersects_c is False, "Box A and Box C should be completely separated"

    # Penetration calculation for Box A penetrating Box B
    dx1 = b_max[0] - a_min[0] # 2.5 - (-1) = 3.5
    dx2 = a_max[0] - b_min[0] # 1.0 - 0.5 = 0.5
    min_x = dx1 if dx1 < dx2 else -dx2
    assert abs(min_x - (-0.5)) < 1e-6, f"Expected penetration -0.5, got {min_x}"
    print("[OK] AABB Overlap and Penetration tests passed.")

if __name__ == "__main__":
    test_aabb_overlap()
