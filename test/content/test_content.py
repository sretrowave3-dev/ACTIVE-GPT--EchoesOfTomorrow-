import os
import json
import sys

def test_content_production():
    print("Testing Phase 18 Full Content Production (Echoes of Tomorrow)...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    nm_path = os.path.join(base_dir, "..", "src", "gameplay", "NarrativeManager.js")
    mm_path = os.path.join(base_dir, "..", "src", "gameplay", "MissionManager.js")
    omega_path = os.path.join(base_dir, "..", "assets", "levels", "sector_omega.json")
    pinnacle_path = os.path.join(base_dir, "..", "assets", "levels", "sector_pinnacle.json")

    assert os.path.exists(nm_path), f"Missing NarrativeManager.js at {nm_path}"
    assert os.path.exists(mm_path), f"Missing MissionManager.js at {mm_path}"
    assert os.path.exists(omega_path), f"Missing sector_omega.json at {omega_path}"
    assert os.path.exists(pinnacle_path), f"Missing sector_pinnacle.json at {pinnacle_path}"

    # 1. Check NarrativeManager
    with open(nm_path, "r", encoding="utf-8") as f:
        nm_content = f.read()
        assert "class NarrativeManager" in nm_content
        assert "Captain Arjun Rao" in nm_content
        assert "unlockLog" in nm_content
        assert "getUnlockedLogs" in nm_content
        assert "narrative:log_unlocked" in nm_content

    # 2. Check multi-chapter MissionManager
    with open(mm_path, "r", encoding="utf-8") as f:
        mm_content = f.read()
        assert "Chapter 1: Whispers in the Static" in mm_content
        assert "Chapter 2: The Core Override" in mm_content
        assert "Chapter 3: Echoes of Tomorrow" in mm_content
        assert "advanceToNextChapter" in mm_content
        assert "loadChapter" in mm_content

    # 3. Check level definitions
    with open(omega_path, "r", encoding="utf-8") as f:
        omega = json.load(f)
        assert omega["id"] == "sector_omega"
        assert len(omega["entities"]) >= 2

    with open(pinnacle_path, "r", encoding="utf-8") as f:
        pinnacle = json.load(f)
        assert pinnacle["id"] == "sector_pinnacle"
        assert len(pinnacle["entities"]) >= 3
        assert pinnacle["playerSpawn"]["position"]["z"] == 12

    print("[SUCCESS] Phase 18 Full Content Production verified successfully!")

if __name__ == "__main__":
    test_content_production()
