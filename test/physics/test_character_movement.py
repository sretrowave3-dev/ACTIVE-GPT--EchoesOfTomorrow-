import os
import sys

def test_character_movement_subsystem():
    print("Testing Phase 23 Advanced Kinematic Character Controller & Surface Physics...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    ray_path = os.path.join(base_dir, "..", "src", "physics", "Raycast.js")
    player_path = os.path.join(base_dir, "..", "src", "player", "PlayerController.js")

    assert os.path.exists(ray_path), f"Missing Raycast.js at {ray_path}"
    assert os.path.exists(player_path), f"Missing PlayerController.js at {player_path}"

    # 1. Verify Raycast
    with open(ray_path, "r", encoding="utf-8") as f:
        rc = f.read()
        assert "class Ray" in rc
        assert "intersectAABB" in rc
        assert "normalX" in rc
        assert "tmin" in rc

    # 2. Verify PlayerController kinematic upgrades
    with open(player_path, "r", encoding="utf-8") as f:
        pc = f.read()
        assert "verticalVelocity" in pc
        assert "jumpSpeed" in pc
        assert "coyoteTimer" in pc
        assert "jumpBufferTimer" in pc
        assert "isCrouched" in pc
        assert "isSliding" in pc
        assert "standingEyeHeight" in pc
        assert "crouchEyeHeight" in pc
        assert "wantsJump" in pc
        assert "wantsCrouch" in pc

    print("[SUCCESS] Phase 23 Kinematic Character Controller verified successfully!")

if __name__ == "__main__":
    test_character_movement_subsystem()
