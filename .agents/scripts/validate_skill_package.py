#!/usr/bin/env python3
"""Static validator for the Molecular Modeling Workbench skill package."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS_ROOT = ROOT / "skills"

REQUIRED_SKILLS = {
    "molecular-workbench-orchestrator",
    "chem-architecture",
    "molecule-construction-ux",
    "ketcher-integration",
    "molecular-graph-connectivity",
    "rdkit-validation",
    "lewis-vsepr-bridge",
    "molecular-3d-viewer",
    "edu-chem-ui",
    "chem-file-interop",
    "test-driven-development",
    "e2e-playwright-testing",
    "code-review-and-quality",
    "source-driven-development",
}

REQUIRED_CONCEPTS = {
    "StructureIntent": "explicit structure intent",
    "componentCount": "connected-component count",
    "four-carbon": "direct four-carbon chain acceptance",
    "touch": "touch/mobile verification",
    "VSEPR": "VSEPR boundary",
    "preset-only": "preset-only testing prohibition",
}

FORBIDDEN_LEGACY = {
    "Prefer loading example molecules over drawing complex molecules by mouse in MVP tests": (
        "legacy preset-preference rule would hide direct-drawing defects"
    ),
}


def parse_front_matter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end < 0:
        return {}
    data: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip()
    return data


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not SKILLS_ROOT.is_dir():
        errors.append(f"Missing skills directory: {SKILLS_ROOT}")
        print_report(errors, warnings)
        return 1

    folders = {p.name for p in SKILLS_ROOT.iterdir() if p.is_dir()}
    missing = REQUIRED_SKILLS - folders
    extra = folders - REQUIRED_SKILLS
    if missing:
        errors.append(f"Missing required skills: {sorted(missing)}")
    if extra:
        warnings.append(f"Unexpected skill folders: {sorted(extra)}")

    names: set[str] = set()
    package_text_parts: list[str] = []

    for folder in sorted(folders):
        skill_dir = SKILLS_ROOT / folder
        skill_path = skill_dir / "SKILL.md"
        agent_path = skill_dir / "agents" / "openai.yaml"
        if not skill_path.is_file():
            errors.append(f"{folder}: missing SKILL.md")
            continue
        if not agent_path.is_file():
            errors.append(f"{folder}: missing agents/openai.yaml")

        text = skill_path.read_text(encoding="utf-8")
        package_text_parts.append(text)
        fm = parse_front_matter(text)
        name = fm.get("name")
        desc = fm.get("description")
        if name != folder:
            errors.append(f"{folder}: front-matter name is {name!r}")
        if not desc or len(desc) < 30:
            errors.append(f"{folder}: missing or weak description")
        if name in names:
            errors.append(f"Duplicate skill name: {name}")
        if name:
            names.add(name)

        for ref in re.findall(r"`references/([^`]+\.md)`", text):
            ref_path = skill_dir / "references" / ref
            if not ref_path.is_file():
                errors.append(f"{folder}: missing referenced file {ref_path.name}")

    package_text = "\n".join(package_text_parts)
    for token, label in REQUIRED_CONCEPTS.items():
        if token not in package_text:
            errors.append(f"Missing required concept: {label} ({token})")

    for phrase, reason in FORBIDDEN_LEGACY.items():
        if phrase in package_text:
            errors.append(f"Forbidden legacy phrase present: {reason}")

    required_docs = [
        ROOT / "README.md",
        ROOT / "SKILL_PACKAGE_MANIFEST.md",
        ROOT / "CHANGELOG.md",
        ROOT / "MIGRATION_GUIDE.md",
    ]
    for doc in required_docs:
        if not doc.is_file():
            errors.append(f"Missing package document: {doc.name}")

    print_report(errors, warnings)
    return 1 if errors else 0


def print_report(errors: list[str], warnings: list[str]) -> None:
    print("Molecular Modeling Skill Package Validator")
    print(f"Skills root: {SKILLS_ROOT}")
    if errors:
        print(f"ERRORS ({len(errors)}):")
        for item in errors:
            print(f"- {item}")
    else:
        print("ERRORS: 0")
    if warnings:
        print(f"WARNINGS ({len(warnings)}):")
        for item in warnings:
            print(f"- {item}")
    else:
        print("WARNINGS: 0")
    if not errors:
        print("RESULT: PASS")
    else:
        print("RESULT: FAIL")


if __name__ == "__main__":
    sys.exit(main())
