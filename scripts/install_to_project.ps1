param(
  [Parameter(Mandatory=$true)]
  [string]$TargetProject
)

$ErrorActionPreference = "Stop"

$sourceRoot = Split-Path -Parent $PSScriptRoot
$target = Resolve-Path -Path $TargetProject -ErrorAction SilentlyContinue
if (-not $target) {
  New-Item -ItemType Directory -Path $TargetProject | Out-Null
  $target = Resolve-Path -Path $TargetProject
}

Write-Host "Installing Molecule Modeling Skill Package to $target"

Copy-Item -Path (Join-Path $sourceRoot ".agents") -Destination $target -Recurse -Force
Copy-Item -Path (Join-Path $sourceRoot "docs") -Destination $target -Recurse -Force
Copy-Item -Path (Join-Path $sourceRoot "AGENTS.md") -Destination $target -Force

$targetScripts = Join-Path $target "scripts"
if (-not (Test-Path $targetScripts)) { New-Item -ItemType Directory -Path $targetScripts | Out-Null }
Copy-Item -Path (Join-Path $sourceRoot "scripts\verify_skill_package.py") -Destination $targetScripts -Force

Write-Host "Done. Next steps:"
Write-Host "1. cd $target"
Write-Host "2. python scripts\verify_skill_package.py"
Write-Host "3. Start Codex in this folder and use docs\CODEX_FIRST_PROMPTS.md"
