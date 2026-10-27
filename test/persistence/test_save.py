import os
import re
import sys

def test_persistence_framework():
    print("Testing Phase 15 Persistence & Save System...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    save_mgr_path = os.path.join(base_dir, "..", "src", "persistence", "SaveManager.js")
    save_svc_path = os.path.join(base_dir, "..", "src", "framework", "services", "SaveService.js")
    
    assert os.path.exists(save_mgr_path), f"SaveManager.js not found at {save_mgr_path}"
    assert os.path.exists(save_svc_path), f"SaveService.js not found at {save_svc_path}"
    
    with open(save_mgr_path, "r", encoding="utf-8") as f:
        save_mgr_content = f.read()
        
    with open(save_svc_path, "r", encoding="utf-8") as f:
        save_svc_content = f.read()

    # Check SaveManager methods and logic
    assert "class SaveManager" in save_mgr_content
    assert "createSnapshot" in save_mgr_content
    assert "applySnapshot" in save_mgr_content
    assert "saveToStorage" in save_mgr_content
    assert "loadFromStorage" in save_mgr_content
    assert "hasSave" in save_mgr_content
    assert "deleteSave" in save_mgr_content
    assert "_memoryStore" in save_mgr_content
    assert "schemaVersion" in save_mgr_content

    # Check SaveService methods
    assert "class SaveService" in save_svc_content
    assert "quickSave" in save_svc_content
    assert "quickLoad" in save_svc_content
    assert "saveGame" in save_svc_content
    assert "loadGame" in save_svc_content
    assert "F5" in save_svc_content
    assert "F9" in save_svc_content
    
    print("[SUCCESS] Phase 15 Persistence & Save System files verified successfully!")

if __name__ == "__main__":
    test_persistence_framework()
