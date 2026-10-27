import os
import subprocess
import sys

def run_all():
    print("==================================================")
    print("      ECHO ENGINE TEST SUITE RUNNER")
    print("==================================================")
    
    test_dir = os.path.dirname(os.path.abspath(__file__))
    test_files = [
        os.path.join(test_dir, "validate_codebase.py"),
        os.path.join(test_dir, "physics", "test_physics.py"),
        os.path.join(test_dir, "physics", "test_character_movement.py"),
        os.path.join(test_dir, "animation", "test_animation.py"),
        os.path.join(test_dir, "animation", "test_anim_graph.py"),
        os.path.join(test_dir, "audio", "test_audio.py"),
        os.path.join(test_dir, "ai", "test_ai.py"),
        os.path.join(test_dir, "streaming", "test_streaming.py"),
        os.path.join(test_dir, "gameplay", "test_gameplay.py"),
        os.path.join(test_dir, "ui", "test_ui.py"),
        os.path.join(test_dir, "persistence", "test_save.py"),
        os.path.join(test_dir, "haos", "test_haos.py"),
        os.path.join(test_dir, "editor", "test_editor.py"),
        os.path.join(test_dir, "content", "test_content.py"),
        os.path.join(test_dir, "packaging", "test_packaging.py"),
        os.path.join(test_dir, "forge", "test_forge.py"),
        os.path.join(test_dir, "rendering", "test_aaa_rendering.py"),
        os.path.join(test_dir, "network", "test_network.py"),
        os.path.join(test_dir, "editor", "test_editor_suite.py")
    ]
    
    total = len(test_files)
    passed = 0
    
    for tf in test_files:
        rel = os.path.relpath(tf, test_dir)
        print(f"\n--- Running: {rel} ---")
        res = subprocess.run([sys.executable, tf], capture_output=True, text=True)
        if res.returncode == 0:
            print(res.stdout.strip())
            passed += 1
        else:
            print(f"[FAIL] {rel}")
            print(res.stdout)
            print(res.stderr)
            sys.exit(1)
            
    print("\n==================================================")
    print(f"  ALL {passed}/{total} SUBSYSTEM TEST SUITES PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_all()
