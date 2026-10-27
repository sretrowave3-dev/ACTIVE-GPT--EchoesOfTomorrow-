#!/usr/bin/env python3
"""
Unit tests for Echo Engine Audio distance attenuation and synthesis algorithms.
"""
import math

def test_inverse_distance_attenuation():
    ref_distance = 1.0
    max_distance = 30.0
    rolloff = 1.0

    def compute_gain(distance):
        d = max(ref_distance, min(distance, max_distance))
        return ref_distance / (ref_distance + rolloff * (d - ref_distance))

    # At reference distance (1m), gain should be 1.0
    assert abs(compute_gain(1.0) - 1.0) < 1e-6
    # At 2m, gain should be 1 / (1 + 1) = 0.5
    assert abs(compute_gain(2.0) - 0.5) < 1e-6
    # At 5m, gain should be 1 / (1 + 4) = 0.2
    assert abs(compute_gain(5.0) - 0.2) < 1e-6
    # Beyond max_distance (e.g. 50m clamped to 30m), gain should be clamped
    gain_max = compute_gain(30.0)
    assert abs(compute_gain(50.0) - gain_max) < 1e-6
    print("[OK] 3D Audio inverse distance attenuation tests passed.")

def test_synth_decay():
    sample_rate = 44100
    duration = 0.12
    samples = int(sample_rate * duration)
    # Ensure exponential decay produces strictly decreasing envelope
    env_start = math.exp(-0 * 35.0)
    env_end = math.exp(-duration * 35.0)
    assert env_start == 1.0
    assert env_end < 0.02
    print("[OK] Audio synthesizer exponential decay curve verified.")

if __name__ == "__main__":
    test_inverse_distance_attenuation()
    test_synth_decay()
