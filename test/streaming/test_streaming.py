#!/usr/bin/env python3
"""
Unit tests for Echo Engine World Partition grid streaming calculations.
"""
import math

def test_world_partition_grid():
    cell_size = 50.0
    active_radius = 1

    def get_active_cells(x, z):
        grid_x = math.floor(x / cell_size)
        grid_z = math.floor(z / cell_size)
        cells = set()
        for dx in range(-active_radius, active_radius + 1):
            for dz in range(-active_radius, active_radius + 1):
                cells.add((grid_x + dx, grid_z + dz))
        return cells

    # At position (0, 0), center is (0, 0), radius 1 should yield 3x3 = 9 cells
    cells_origin = get_active_cells(0, 0)
    assert len(cells_origin) == 9
    assert (0, 0) in cells_origin
    assert (1, 1) in cells_origin
    assert (-1, -1) in cells_origin

    # At position (105, 0), center is (2, 0)
    cells_moved = get_active_cells(105, 0)
    assert len(cells_moved) == 9
    assert (2, 0) in cells_moved
    assert (-1, -1) not in cells_moved

    # Unloaded cells calculation
    unloaded = cells_origin - cells_moved
    assert len(unloaded) > 0
    print("[OK] World Partition cell calculation and radius transition tests passed.")

if __name__ == "__main__":
    test_world_partition_grid()
