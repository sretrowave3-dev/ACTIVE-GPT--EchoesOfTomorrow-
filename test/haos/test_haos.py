import os
import re
import sys

def test_haos_subsystem():
    print("Testing Phase 16 HAOS (Hardware-Adaptive Optimization System)...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    haos_dir = os.path.join(base_dir, "..", "src", "haos")
    svc_path = os.path.join(base_dir, "..", "src", "framework", "services", "HAOSService.js")

    required_files = [
        "HardwareScanner.js",
        "PerformanceProfile.js",
        "CapabilityAnalyzer.js",
        "FrameMonitor.js",
        "AdaptiveController.js"
    ]

    for rf in required_files:
        p = os.path.join(haos_dir, rf)
        assert os.path.exists(p), f"Missing HAOS component: {rf}"
        with open(p, "r", encoding="utf-8") as f:
            content = f.read()
            assert len(content) > 100, f"File {rf} seems empty"

    assert os.path.exists(svc_path), "Missing HAOSService.js"
    with open(svc_path, "r", encoding="utf-8") as f:
        svc_content = f.read()
        assert "class HAOSService" in svc_content
        assert "getTelemetry" in svc_content
        assert "forceTier" in svc_content

    # Logic Verification
    # 1. PerformanceProfile tiers
    with open(os.path.join(haos_dir, "PerformanceProfile.js"), "r", encoding="utf-8") as f:
        pp_content = f.read()
        assert "forTier" in pp_content
        assert "LOW" in pp_content
        assert "MEDIUM" in pp_content
        assert "HIGH" in pp_content
        assert "ULTRA" in pp_content

    # 2. CapabilityAnalyzer multidimensional evaluation
    with open(os.path.join(haos_dir, "CapabilityAnalyzer.js"), "r", encoding="utf-8") as f:
        ca_content = f.read()
        assert "cpuScore" in ca_content
        assert "gpuScore" in ca_content
        assert "memScore" in ca_content
        assert "bottleneck" in ca_content

    # 3. FrameMonitor ring buffer & health classification
    with open(os.path.join(haos_dir, "FrameMonitor.js"), "r", encoding="utf-8") as f:
        fm_content = f.read()
        assert "Float32Array" in fm_content
        assert "OVERBURDENED" in fm_content
        assert "UNDERUTILIZED" in fm_content
        assert "HEALTHY" in fm_content

    # 4. AdaptiveController anti-oscillation & tier shifts
    with open(os.path.join(haos_dir, "AdaptiveController.js"), "r", encoding="utf-8") as f:
        ac_content = f.read()
        assert "adaptationCooldownSeconds" in ac_content
        assert "_applyTierShift" in ac_content
        assert "forceTier" in ac_content

    print("[SUCCESS] Phase 16 HAOS subsystem verified successfully!")

if __name__ == "__main__":
    test_haos_subsystem()
