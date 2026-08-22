$ErrorActionPreference = "Stop"
$toolDir = Join-Path $PSScriptRoot "..\tools\track-b-api-to-mcp-wrapper"
Push-Location $toolDir
try {
    python .\client_smoke_test.py
}
finally {
    Pop-Location
}
