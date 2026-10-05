param([ValidateRange(1024,65535)][int]$Port = 4173, [switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodeExecutable = $nodeCommand.Source
} else {
    $nodeExecutable = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $nodeExecutable)) {
    Write-Host 'Node.js is not installed. Open dist/index.html directly, or install Node.js.'
    Read-Host 'Press Enter to close'
    exit 1
}
$env:PORT = $Port
$url = "http://localhost:$Port"
Write-Host "UNDERY - $url"
Write-Host 'Keep this window open. Press Ctrl+C to stop.'
try {
    $existingPage = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 3
    if ($existingPage.Content -match '<title>UNDERY') {
        if ($OpenBrowser) { Start-Process $url }
        Write-Host 'UNDERY is already running.'
        exit 0
    }
} catch { }
$serverArguments = @((Join-Path $PSScriptRoot 'server.mjs'))
if ($OpenBrowser) { $serverArguments += '--open' }
& $nodeExecutable @serverArguments
if ($LASTEXITCODE -ne 0) { Read-Host 'Press Enter to close' }
