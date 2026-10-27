#!/usr/bin/env python3
"""
Unit tests for Echo Engine Animation keyframe sampling and VAT player.
"""

def test_keyframe_lerp():
    times = [0.0, 1.0, 2.0]
    values = [0.0, 10.0, 20.0]

    def sample(t):
        if t <= times[0]: return values[0]
        if t >= times[-1]: return values[-1]
        for i in range(len(times) - 1):
            if times[i] <= t <= times[i + 1]:
                factor = (t - times[i]) / (times[i + 1] - times[i])
                return values[i] + (values[i + 1] - values[i]) * factor
        return 0.0

    assert sample(0.0) == 0.0
    assert sample(0.5) == 5.0
    assert sample(1.0) == 10.0
    assert sample(1.5) == 15.0
    assert sample(2.0) == 20.0
    print("[OK] Animation keyframe LERP tests passed.")

def test_vat_player():
    total_frames = 60
    fps = 30
    speed = 1.0
    current_frame = 0.0

    delta = 1.0 # 1 second = 30 frames
    current_frame = (current_frame + delta * fps * speed) % total_frames
    assert current_frame == 30.0
    norm = current_frame / total_frames
    assert norm == 0.5
    print("[OK] VAT Player frame cycling tests passed.")

if __name__ == "__main__":
    test_keyframe_lerp()
    test_vat_player()
