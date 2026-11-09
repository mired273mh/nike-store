$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
& (Join-Path $PSScriptRoot 'test-setup.ps1')
$env:DB_DATABASE = 'nike_store_test'
$env:APP_ORIGINS = 'http://127.0.0.1:3107,http://localhost:3107'
$phpBin = Join-Path $runtimeRoot 'php/php.exe'
New-Item -ItemType Directory -Path (Join-Path $projectRoot '.runtime') -Force | Out-Null
$processes = @()
try {
    foreach ($port in @(8001,8002)) {
        if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw "Port $port dang duoc su dung. Tat test server cu truoc." }
        $apiArgs = @('-c', ('"' + (Join-Path $projectRoot 'backend/php.ini') + '"'), '-d', ('"extension_dir=' + (Join-Path $runtimeRoot 'php/ext') + '"'), '-S', "127.0.0.1:$port", '-t', ('"' + (Join-Path $projectRoot 'backend/public') + '"'), ('"' + (Join-Path $projectRoot 'backend/public/router.php') + '"'))
        $processes += Start-Process -FilePath $phpBin -ArgumentList $apiArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $projectRoot ".runtime/php-test-$port.log") -RedirectStandardError (Join-Path $projectRoot ".runtime/php-test-$port-errors.log")
    }
    Push-Location $projectRoot
    try { node scripts/build-test.mjs; if ($LASTEXITCODE -ne 0) { throw 'Test build that bai.' }; node scripts/start-test.mjs } finally { Pop-Location }
} finally { foreach ($process in $processes) { if (!$process.HasExited) { Stop-Process -Id $process.Id } } }
