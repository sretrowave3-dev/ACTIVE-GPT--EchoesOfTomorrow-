import os
import json
import re
import sys

def test_editor_toolchain():
    print("Testing Phase 17 Editor & Developer Toolchain...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    editor_dir = os.path.join(base_dir, "..", "src", "editor")
    svc_path = os.path.join(base_dir, "..", "src", "framework", "services", "EditorService.js")
    level_path = os.path.join(base_dir, "..", "assets", "levels", "sector_omega.json")

    required_files = [
        "LevelSerializer.js",
        "CommandInterpreter.js",
        "EditorDevOverlay.js"
    ]

    for rf in required_files:
        p = os.path.join(editor_dir, rf)
        assert os.path.exists(p), f"Missing editor file: {rf}"

    assert os.path.exists(svc_path), "Missing EditorService.js"
    assert os.path.exists(level_path), "Missing sector_omega.json"

    # 1. Verify LevelSerializer
    with open(os.path.join(editor_dir, "LevelSerializer.js"), "r", encoding="utf-8") as f:
        ls_content = f.read()
        assert "class LevelSerializer" in ls_content
        assert "validate" in ls_content
        assert "exportLevel" in ls_content
        assert "importLevel" in ls_content

    # 2. Verify CommandInterpreter
    with open(os.path.join(editor_dir, "CommandInterpreter.js"), "r", encoding="utf-8") as f:
        ci_content = f.read()
        assert "class CommandInterpreter" in ci_content
        assert "help" in ci_content
        assert "list" in ci_content
        assert "inspect" in ci_content
        assert "tp" in ci_content
        assert "spawn" in ci_content
        assert "haos" in ci_content

    # 3. Verify EditorService
    with open(svc_path, "r", encoding="utf-8") as f:
        es_content = f.read()
        assert "class EditorService" in es_content
        assert "toggleEditor" in es_content
        assert "loadLevel" in es_content
        assert "exportLevel" in es_content

    # 4. Validate sample level JSON structure
    with open(level_path, "r", encoding="utf-8") as f:
        level_data = json.load(f)
        assert level_data["id"] == "sector_omega"
        assert "playerSpawn" in level_data
        assert "entities" in level_data
        assert len(level_data["entities"]) >= 2
        assert "mission" in level_data

    print("[SUCCESS] Phase 17 Editor & Developer Toolchain verified successfully!")

if __name__ == "__main__":
    test_editor_toolchain()
