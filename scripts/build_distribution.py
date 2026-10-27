import os
import shutil
import hashlib
import json
import sys

def build_distribution():
    print("==================================================")
    print("   ECHO ENGINE // PRODUCTION DISTRIBUTION BUILD")
    print("==================================================")

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dist_dir = os.path.join(root_dir, "dist")
    
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    os.makedirs(dist_dir, exist_ok=True)

    manifest_data = {
        "game": {
            "title": "Echoes of Tomorrow",
            "version": "1.0.0-shippable",
            "author": "Echo Engine Team",
            "buildTimestamp": ""
        },
        "engine": {
            "name": "Echo Engine",
            "version": "1.0.0",
            "targetPlatform": "web-standalone"
        },
        "levels": [
            "sector_omega.json",
            "sector_pinnacle.json"
        ],
        "files": {}
    }

    # Directories to package into distribution
    package_dirs = [
        os.path.join(root_dir, "src"),
        os.path.join(root_dir, "assets")
    ]

    total_files = 0
    total_bytes = 0

    for pdir in package_dirs:
        if not os.path.exists(pdir):
            continue
        rel_base = os.path.relpath(pdir, root_dir)
        target_base = os.path.join(dist_dir, rel_base)
        os.makedirs(target_base, exist_ok=True)

        for dirpath, _, filenames in os.walk(pdir):
            for fname in filenames:
                src_path = os.path.join(dirpath, fname)
                rel_path = os.path.relpath(src_path, root_dir).replace("\\", "/")
                dest_path = os.path.join(dist_dir, rel_path)

                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                shutil.copy2(src_path, dest_path)

                # Compute SHA-256
                with open(src_path, "rb") as f:
                    content = f.read()
                    sha256 = hashlib.sha256(content).hexdigest()
                    size = len(content)

                file_type = "script" if fname.endswith(".js") else ("level" if fname.endswith(".json") else "asset")
                manifest_data["files"][rel_path] = {
                    "size": size,
                    "sha256": sha256,
                    "type": file_type
                }

                total_files += 1
                total_bytes += size

    # Package index.html into dist/
    index_src = os.path.join(root_dir, "index.html")
    index_dest = os.path.join(dist_dir, "index.html")
    if os.path.exists(index_src):
        shutil.copy2(index_src, index_dest)
        with open(index_src, "rb") as f:
            content = f.read()
            sha256 = hashlib.sha256(content).hexdigest()
        manifest_data["files"]["index.html"] = {
            "size": len(content),
            "sha256": sha256,
            "type": "entrance"
        }
        total_files += 1
        total_bytes += len(content)

    # Write package.manifest.json
    manifest_path = os.path.join(dist_dir, "package.manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print(f"\n[SUCCESS] Distribution build completed!")
    print(f"  Target Directory: {dist_dir}")
    print(f"  Packaged Files:   {total_files}")
    print(f"  Total Payload:    {total_bytes / 1024:.2f} KB")
    print(f"  Manifest Path:    {manifest_path}")

    # Verify integrity of all dist files against manifest
    print("\n--- Verifying Distribution Package Integrity ---")
    verified = 0
    for rel_path, desc in manifest_data["files"].items():
        fp = os.path.join(dist_dir, rel_path)
        assert os.path.exists(fp), f"Packaged file missing: {fp}"
        with open(fp, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()
            assert h == desc["sha256"], f"Checksum mismatch for {rel_path}"
        verified += 1

    print(f"[SUCCESS] 100% Package Integrity Verified! ({verified}/{total_files} files cryptographically matching SHA-256)")
    print("==================================================")

if __name__ == "__main__":
    build_distribution()
