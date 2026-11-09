param([switch]$Production, [switch]$OpenBrowser, [int]$Port = 3000)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
$phpBin = Join-Path $runtimeRoot 'php/php.exe'
if (!(Test-Path -LiteralPath $phpBin)) { throw 'Chay scripts/setup.ps1 truoc.' }
$phpArgs = @('-c', (Join-Path $projectRoot 'backend/php.ini'), '-d', ('extension_dir=' + (Join-Path $runtimeRoot 'php/ext')))
& (Join-Path $PSScriptRoot 'start-db.ps1')
& $phpBin @phpArgs (Join-Path $projectRoot 'backend/database/init.php')
if ($LASTEXITCODE -ne 0) { throw 'Khoi tao database that bai.' }
$appRuntime = Join-Path $projectRoot '.runtime'
New-Item -ItemType Directory -Path $appRuntime -Force | Out-Null
$apiListener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if (!$apiListener) {
    $apiArgs = @('-c', ('"' + (Join-Path $projectRoot 'backend/php.ini') + '"'), '-d', ('"extension_dir=' + (Join-Path $runtimeRoot 'php/ext') + '"'), '-S', '127.0.0.1:8000', '-t', ('"' + (Join-Path $projectRoot 'backend/public') + '"'), ('"' + (Join-Path $projectRoot 'backend/public/router.php') + '"'))
    $apiProcess = Start-Process -FilePath $phpBin -ArgumentList $apiArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $appRuntime 'php.log') -RedirectStandardError (Join-Path $appRuntime 'php-errors.log')
    Set-Content -LiteralPath (Join-Path $appRuntime 'php.pid') -Value $apiProcess.Id
}
Push-Location $projectRoot
$browserJob = $null
try {
    $websiteUrl = "http://127.0.0.1:$Port"
    if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) {
        try { $health = Invoke-RestMethod -Uri "$websiteUrl/api/health" -TimeoutSec 3 }
        catch { throw "Cong $Port dang duoc su dung. Vui long dong ung dung khac hoac chon cong khac." }
        if ($health.status -ne 'ok' -or $health.backend -ne 'PHP' -or $health.database -ne 'MySQL') { throw "Cong $Port khong phai Nike Store." }
        Write-Output "Nike Store dang chay: $websiteUrl"
        if ($OpenBrowser) { Start-Process $websiteUrl }
        return
    }
    if ($OpenBrowser) {
        $browserJob = Start-Job -ArgumentList $websiteUrl -ScriptBlock {
            param($url)
            for ($attempt = 0; $attempt -lt 120; $attempt++) {
                try {
                    $health = Invoke-RestMethod -Uri "$url/api/health" -TimeoutSec 2
                    if ($health.status -eq 'ok' -and $health.backend -eq 'PHP' -and $health.database -eq 'MySQL') { Start-Process $url; return }
                } catch { }
                Start-Sleep -Milliseconds 500
            }
        }
    }
    if ($Production) { npm.cmd run build; if ($LASTEXITCODE -ne 0) { throw 'Build that bai.' }; npm.cmd run start -- --hostname 127.0.0.1 --port $Port }
    else { npm.cmd run dev -- --hostname 127.0.0.1 --port $Port }
    if ($LASTEXITCODE -ne 0) { throw 'Website khong khoi dong duoc. Xem loi o tren.' }
} finally {
    if ($browserJob) { Stop-Job -Job $browserJob -ErrorAction SilentlyContinue; Remove-Job -Job $browserJob -ErrorAction SilentlyContinue }
    Pop-Location
}
