from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / ".agents" / "skills"

if not SKILLS.exists():
    print(f"ERROR: skills directory not found: {SKILLS}")
    sys.exit(1)

names = []
errors = []
for skill_dir in sorted(p for p in SKILLS.iterdir() if p.is_dir()):
    skill_file = skill_dir / "SKILL.md"
    if not skill_file.exists():
        errors.append(f"Missing SKILL.md: {skill_dir}")
        continue
    text = skill_file.read_text(encoding="utf-8")
    if not text.startswith("---"):
        errors.append(f"Missing YAML front matter: {skill_file}")
        continue
    m = re.match(r"---\s*\n(.*?)\n---", text, flags=re.S)
    if not m:
        errors.append(f"Malformed front matter: {skill_file}")
        continue
    fm = m.group(1)
    name = re.search(r"^name:\s*(.+)$", fm, flags=re.M)
    desc = re.search(r"^description:\s*(.+)$", fm, flags=re.M)
    if not name:
        errors.append(f"Missing name: {skill_file}")
    else:
        names.append(name.group(1).strip())
    if not desc:
        errors.append(f"Missing description: {skill_file}")

seen = set()
for n in names:
    if n in seen:
        errors.append(f"Duplicate skill name: {n}")
    seen.add(n)

print(f"Found {len(names)} skills:")
for n in names:
    print(f"- {n}")

if errors:
    print("\nERRORS:")
    for e in errors:
        print(f"- {e}")
    sys.exit(1)

print("\nOK: skill package structure is valid.")
