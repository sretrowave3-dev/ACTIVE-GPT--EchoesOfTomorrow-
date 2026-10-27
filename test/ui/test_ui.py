import os
import re
import sys

def test_ui_framework():
    print("Testing Phase 14 UI/UX Framework...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    ui_mgr_path = os.path.join(base_dir, "..", "src", "ui", "UIManager.js")
    ui_svc_path = os.path.join(base_dir, "..", "src", "framework", "services", "UIService.js")
    
    assert os.path.exists(ui_mgr_path), f"UIManager.js not found at {ui_mgr_path}"
    assert os.path.exists(ui_svc_path), f"UIService.js not found at {ui_svc_path}"
    
    with open(ui_mgr_path, "r", encoding="utf-8") as f:
        ui_mgr_content = f.read()
        
    with open(ui_svc_path, "r", encoding="utf-8") as f:
        ui_svc_content = f.read()

    # Check key methods and classes
    assert "class UIManager" in ui_mgr_content
    assert "_injectStyles" in ui_mgr_content
    assert "_createDOM" in ui_mgr_content
    assert "updateHealth" in ui_mgr_content
    assert "updateStamina" in ui_mgr_content
    assert "showPrompt" in ui_mgr_content
    assert "hidePrompt" in ui_mgr_content
    assert "showNotification" in ui_mgr_content
    assert "refreshMissionList" in ui_mgr_content
    assert "togglePauseMenu" in ui_mgr_content
    assert "destroy" in ui_mgr_content

    assert "class UIService" in ui_svc_content
    assert "this.uiManager = new UIManager" in ui_svc_content
    assert "showNotification" in ui_svc_content
    assert "togglePause" in ui_svc_content
    
    print("[SUCCESS] Phase 14 UI/UX Framework files verified successfully!")

if __name__ == "__main__":
    test_ui_framework()
