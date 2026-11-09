param([switch]$OpenBrowser, [int]$Port = 3000)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$websiteUrl = "http://127.0.0.1:$Port"
try {
    $health = Invoke-RestMethod -Uri "$websiteUrl/api/health" -TimeoutSec 2
    if ($health.status -eq 'ok' -and $health.backend -eq 'PHP' -and $health.database -eq 'MySQL') {
        Write-Output "Nike Store dang chay: $websiteUrl"
        if ($OpenBrowser) { Start-Process $websiteUrl }
        return
    }
} catch { }
$identity = [System.BitConverter]::ToString([System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($projectRoot.ToLowerInvariant()))).Replace('-', '').Substring(0, 16)
$startupMutex = New-Object System.Threading.Mutex($false, "Local\NikeStore-$identity-$Port")
$ownsMutex = $false
try {
    try { $ownsMutex = $startupMutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
    if (!$ownsMutex) { Write-Output 'Nike Store dang duoc khoi dong. Vui long doi.'; return }
    if (!(Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Can cai Node.js truoc khi chay website.' }
    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
    $needsSetup = !(Test-Path -LiteralPath (Join-Path $runtimeRoot 'php/php.exe')) -or !(Test-Path -LiteralPath (Join-Path $runtimeRoot 'mysql-data/mysql')) -or !(Test-Path -LiteralPath (Join-Path $projectRoot 'node_modules/next/package.json')) -or !(Test-Path -LiteralPath (Join-Path $projectRoot 'backend/.env'))
    if ($needsSetup) { & (Join-Path $PSScriptRoot 'setup.ps1') }
    & (Join-Path $PSScriptRoot 'start.ps1') -Port $Port -OpenBrowser:$OpenBrowser
} finally {
    if ($ownsMutex) { $startupMutex.ReleaseMutex() }
    $startupMutex.Dispose()
}
