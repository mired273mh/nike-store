$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'NikeStoreRuntime'
$phpBin = Join-Path $runtimeRoot 'php/php.exe'
$composer = Join-Path $runtimeRoot 'composer.phar'
$caFile = Join-Path $runtimeRoot 'cacert.pem'
if (!(Test-Path -LiteralPath $composer)) { & curl.exe -fsSL --connect-timeout 30 -o $composer 'https://getcomposer.org/composer-stable.phar'; if ($LASTEXITCODE -ne 0) { throw 'Khong tai duoc Composer.' } }
if (!(Test-Path -LiteralPath $caFile)) { & curl.exe -fsSL --connect-timeout 30 -o $caFile 'https://curl.se/ca/cacert.pem'; if ($LASTEXITCODE -ne 0) { throw 'Khong tai duoc CA certificate.' } }
& $phpBin -c (Join-Path $projectRoot 'backend/php.ini') -d ('extension_dir=' + (Join-Path $runtimeRoot 'php/ext')) -d extension=zip -d extension=curl -d ('openssl.cafile=' + $caFile) $composer install ('--working-dir=' + (Join-Path $projectRoot 'backend')) --no-interaction --prefer-dist --no-progress
if ($LASTEXITCODE -ne 0) { throw 'Cai thu vien gui email that bai.' }
