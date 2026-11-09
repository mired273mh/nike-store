param([string]$OutputPath = (Join-Path (Split-Path $PSScriptRoot -Parent) '../Website-Nike-Store-Submission.zip'))
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$stage = Join-Path $env:TEMP ('NikeStoreSubmission-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $stage | Out-Null
foreach ($dir in @('src','public','docs','scripts','tests')) { Copy-Item -LiteralPath (Join-Path $projectRoot $dir) -Destination $stage -Recurse }
$backendStage = Join-Path $stage 'backend'
New-Item -ItemType Directory -Path $backendStage | Out-Null
foreach ($dir in @('src','public','database')) { Copy-Item -LiteralPath (Join-Path $projectRoot "backend/$dir") -Destination $backendStage -Recurse }
foreach ($file in @('.env.example','php.ini','composer.json','Dockerfile')) { Copy-Item -LiteralPath (Join-Path $projectRoot "backend/$file") -Destination $backendStage }
New-Item -ItemType Directory -Path (Join-Path $backendStage 'storage') | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'backend/storage/.gitkeep') -Destination (Join-Path $backendStage 'storage')
foreach ($file in @('package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json','eslint.config.mjs','postcss.config.mjs','playwright.config.ts','README.md','REVIEW.md','.env.example','.gitignore','.prettierrc.json','.prettierignore','.dockerignore','Dockerfile','compose.yaml','AGENTS.md')) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $file) -Destination $stage
}
$evidence = Join-Path $stage 'review-results'
New-Item -ItemType Directory -Path $evidence | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot 'review-results/after') -Destination $evidence -Recurse
foreach ($file in @('playwright-after.json','build-after.txt','lint-after.txt','types-after.txt','php-lint.txt','SUMMARY.md')) { Copy-Item -LiteralPath (Join-Path $projectRoot "review-results/$file") -Destination $evidence }
$forbidden = Get-ChildItem -LiteralPath $stage -Recurse -Force -File | Where-Object { $_.Name -eq '.env' -or $_.Name -eq 'legacy-import.json' -or $_.Name -like '*.secret' }
if ($forbidden) { throw 'Unexpected private file in submission stage.' }
& node (Join-Path $PSScriptRoot 'archive.mjs') $stage ([System.IO.Path]::GetFullPath($OutputPath))
if ($LASTEXITCODE -ne 0) { throw 'Tao ZIP that bai.' }
Write-Output ('Submission: ' + [System.IO.Path]::GetFullPath($OutputPath))
