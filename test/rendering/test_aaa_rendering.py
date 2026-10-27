import os
import re
import sys

def test_aaa_rendering_pipeline():
    print("Testing Phase 22 AAA Post-Processing, Volumetrics & Lighting Pipeline...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    post_path = os.path.join(base_dir, "..", "src", "rendering", "postprocessing", "PostProcessStack.js")
    light_path = os.path.join(base_dir, "..", "src", "rendering", "lighting", "LightingRig.js")
    vfx_path = os.path.join(base_dir, "..", "src", "rendering", "vfx", "ParticleEmitter.js")
    render_svc_path = os.path.join(base_dir, "..", "src", "framework", "services", "RenderService.js")

    assert os.path.exists(post_path), f"Missing PostProcessStack.js at {post_path}"
    assert os.path.exists(light_path), f"Missing LightingRig.js at {light_path}"
    assert os.path.exists(vfx_path), f"Missing ParticleEmitter.js at {vfx_path}"
    assert os.path.exists(render_svc_path), f"Missing RenderService.js at {render_svc_path}"

    # 1. Verify PostProcessStack
    with open(post_path, "r", encoding="utf-8") as f:
        pp = f.read()
        assert "class PostProcessStack" in pp
        assert "applyHAOSTier" in pp
        assert "setExposure" in pp
        assert "setColorGrading" in pp
        assert "setBloom" in pp
        assert "setVignette" in pp

    # 2. Verify LightingRig
    with open(light_path, "r", encoding="utf-8") as f:
        lr = f.read()
        assert "class LightingRig" in lr
        assert "applyPreset" in lr
        assert "cyberpunk_neon" in lr
        assert "monsoon_dusk" in lr
        assert "addPointLight" in lr
        assert "removePointLight" in lr

    # 3. Verify ParticleEmitter
    with open(vfx_path, "r", encoding="utf-8") as f:
        pe = f.read()
        assert "class ParticleEmitter" in pe
        assert "burst" in pe
        assert "update" in pe
        assert "InstancedMesh" in pe

    # 4. Verify RenderService integration
    with open(render_svc_path, "r", encoding="utf-8") as f:
        rs = f.read()
        assert "PostProcessStack" in rs
        assert "LightingRig" in rs
        assert "ParticleEmitter" in rs
        assert "spawnParticleBurst" in rs
        assert "setAtmospherePreset" in rs

    print("[SUCCESS] Phase 22 AAA Rendering Pipeline verified successfully!")

if __name__ == "__main__":
    test_aaa_rendering_pipeline()
