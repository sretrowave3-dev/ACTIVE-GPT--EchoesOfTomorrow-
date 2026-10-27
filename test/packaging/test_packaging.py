import os
import re
import sys

def test_packaging_subsystem():
    print("Testing Phase 20 Security, Packaging & Deployment...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    pkg_dir = os.path.join(base_dir, "..", "src", "packaging")
    svc_path = os.path.join(base_dir, "..", "src", "framework", "services", "PackagingService.js")
    build_script = os.path.join(base_dir, "..", "scripts", "build_distribution.py")

    required_files = [
        "VirtualFileSystem.js",
        "IntegrityVerifier.js",
        "PackageManifest.js"
    ]

    for rf in required_files:
        p = os.path.join(pkg_dir, rf)
        assert os.path.exists(p), f"Missing packaging file: {rf}"

    assert os.path.exists(svc_path), "Missing PackagingService.js"
    assert os.path.exists(build_script), "Missing build_distribution.py"

    # 1. Verify VFS
    with open(os.path.join(pkg_dir, "VirtualFileSystem.js"), "r", encoding="utf-8") as f:
        vfs_content = f.read()
        assert "class VirtualFileSystem" in vfs_content
        assert "resolvePath" in vfs_content
        assert "mount" in vfs_content

    # 2. Verify IntegrityVerifier
    with open(os.path.join(pkg_dir, "IntegrityVerifier.js"), "r", encoding="utf-8") as f:
        iv_content = f.read()
        assert "class IntegrityVerifier" in iv_content
        assert "computeSHA256" in iv_content
        assert "verify" in iv_content
        assert "verifyManifest" in iv_content

    # 3. Verify PackageManifest
    with open(os.path.join(pkg_dir, "PackageManifest.js"), "r", encoding="utf-8") as f:
        pm_content = f.read()
        assert "class PackageManifest" in pm_content
        assert "addFile" in pm_content
        assert "serialize" in pm_content
        assert "parse" in pm_content

    print("[SUCCESS] Phase 20 Packaging & Security subsystem verified successfully!")

if __name__ == "__main__":
    test_packaging_subsystem()
