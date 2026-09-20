#!/usr/bin/env python3
"""
Oasyss Flux — Divyesh Edition
macOS AppIcon.icns Generator
Generates native macOS .icns from logo.png.
"""

import subprocess
import os
import sys

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ps1_script = os.path.join(script_dir, "generate-icns.ps1")
    root_dir = os.path.abspath(os.path.join(script_dir, "..", ".."))

    print(f"Generating macOS icon for Oasyss Flux...")
    cmd = ["powershell", "-ExecutionPolicy", "Bypass", "-File", ps1_script]
    result = subprocess.run(cmd, cwd=root_dir)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
