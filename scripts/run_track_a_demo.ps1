$ErrorActionPreference = "Stop"
$toolDir = Join-Path $PSScriptRoot "..\tools\track-a-ai-shopping-visibility"
Push-Location $toolDir
try {
    python .\ai_shopping_visibility_audit.py --help
}
finally {
    Pop-Location
}
