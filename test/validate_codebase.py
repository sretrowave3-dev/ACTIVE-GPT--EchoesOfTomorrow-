#!/usr/bin/env python3
"""
Automated Architectural and Dependency Validator for Echo Engine.
Validates:
1. No merge conflict markers exist in source files.
2. Every relative import points to an existing file on disk.
3. Checks JSON file syntax.
"""

import os
import re
import sys
import json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")

IMPORT_RE = re.compile(r"""(?:import|from)\s+['"]([^'"]+)['"]""")
CONFLICT_RE = re.compile(r"^(<{7}\s|={7}$|>{7}\s)", re.MULTILINE)

errors = []
total_files = 0
total_imports = 0

print("=== Echo Engine Architecture Validation ===")
print(f"Root: {ROOT}")
print(f"Source: {SRC}\n")

# 1. Validate JS Files & Imports
for root, dirs, files in os.walk(SRC):
    for f in files:
        if f.endswith(".js"):
            total_files += 1
            file_path = os.path.join(root, f)
            rel_path = os.path.relpath(file_path, ROOT)
            
            with open(file_path, "r", encoding="utf-8", errors="replace") as fh:
                content = fh.read()
                
            # Check merge conflict markers
            if CONFLICT_RE.search(content):
                errors.append(f"[CONFLICT] Merge conflict marker found in {rel_path}")
                
            # Check imports
            for m in IMPORT_RE.finditer(content):
                imp = m.group(1)
                total_imports += 1
                if imp.startswith("."):
                    target = os.path.normpath(os.path.join(root, imp))
                    if not os.path.exists(target):
                        errors.append(f"[BROKEN IMPORT] {rel_path} imports '{imp}' (resolved: {target})")

# 2. Validate package.json
pkg_path = os.path.join(ROOT, "package.json")
if os.path.exists(pkg_path):
    try:
        with open(pkg_path, "r", encoding="utf-8") as f:
            json.load(f)
        print("[OK] package.json syntax is valid.")
    except Exception as e:
        errors.append(f"[JSON ERROR] package.json: {e}")
else:
    errors.append("[MISSING] package.json is missing.")

# 3. Report Results
print(f"Scanned {total_files} JavaScript files across subsystems.")
print(f"Verified {total_imports} import statements.")

if errors:
    print(f"\n[FAIL] Validation found {len(errors)} issues:")
    for err in errors:
        print(f"  {err}")
    sys.exit(1)
else:
    print("\n[SUCCESS] All source files, imports, and configurations passed validation!")
    sys.exit(0)
