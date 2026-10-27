import os
import re
import sys

def test_forge_engine_sdk():
    print("Testing Phase 21 Forge Engine Public SDK & Platform Extraction...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    forge_dir = os.path.join(base_dir, "..", "src", "forge")

    required_files = [
        "ForgeEngine.js",
        "ForgeApplication.js",
        "ForgePlugin.js",
        "index.js"
    ]

    for rf in required_files:
        p = os.path.join(forge_dir, rf)
        assert os.path.exists(p), f"Missing Forge file: {rf}"

    # 1. Check ForgeEngine
    with open(os.path.join(forge_dir, "ForgeEngine.js"), "r", encoding="utf-8") as f:
        fe = f.read()
        assert "class ForgeEngine" in fe
        assert "static async launch" in fe
        assert "registerPlugin" in fe
        assert "pause" in fe
        assert "resume" in fe

    # 2. Check ForgeApplication
    with open(os.path.join(forge_dir, "ForgeApplication.js"), "r", encoding="utf-8") as f:
        fa = f.read()
        assert "class ForgeApplication" in fa
        assert "onInit" in fa
        assert "onStart" in fa
        assert "onUpdate" in fa
        assert "onShutdown" in fa

    # 3. Check ForgePlugin
    with open(os.path.join(forge_dir, "ForgePlugin.js"), "r", encoding="utf-8") as f:
        fp = f.read()
        assert "class ForgePlugin" in fp
        assert "onInstall" in fp
        assert "onUpdate" in fp
        assert "onUninstall" in fp

    # 4. Check barrel exports
    with open(os.path.join(forge_dir, "index.js"), "r", encoding="utf-8") as f:
        idx = f.read()
        assert "ForgeEngine" in idx
        assert "ForgeApplication" in idx
        assert "ForgePlugin" in idx

    print("[SUCCESS] Phase 21 Forge Engine Public SDK verified successfully!")

if __name__ == "__main__":
    test_forge_engine_sdk()
