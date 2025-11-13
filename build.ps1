Write-Host "Start build..." -ForegroundColor Cyan

function Load-Env {
    $envFile = ".env"
    if (Test-Path $envFile) {
        Write-Host "Found .env file! load .env file..." -ForegroundColor Yellow
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            if ($line -and -not $line.StartsWith("#")) {
                if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
                    $varName = $matches[1]
                    $varValue = $matches[2]
                    $varValue = $varValue.Trim('"').Trim("'")
                    [Environment]::SetEnvironmentVariable($varName, $varValue, "Process")
                }
            }
        }
    }
    Write-Host "Load .env file done!" -ForegroundColor Yellow
}

$EMCC_CMD = "emcc"

$emccExists = Get-Command $EMCC_CMD -ErrorAction SilentlyContinue
if (-not $emccExists) {
    Write-Host "'emcc' command could not found. please install it." -ForegroundColor Red
    exit 1
}

Load-Env

if (-not $env:EXPORTED_FUNCTIONS) {
    $env:EXPORTED_FUNCTIONS = '["_test_console"]'
}
if (-not $env:EXPORTED_RUNTIME_METHODS) {
    $env:EXPORTED_RUNTIME_METHODS = '["ccall"]'
}

Write-Host "Build C++ code..." -ForegroundColor Yellow

function Show-Progress {
    param([int]$ProcessId)
    
    $progress = 0
    while (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue) {
        if ($progress -lt 98) {
            $progress += 2
        }
        Write-Host "`rProgress: $progress%" -NoNewline
        Start-Sleep -Seconds 1
    }
    Write-Host "`rProgress: 100%" -ForegroundColor Green
}

$emccArgs = @(
    "cpp/src/main.cpp",
    "-o", "web/public/main.js",
    "-s", "EXPORTED_FUNCTIONS=$($env:EXPORTED_FUNCTIONS)",
    "-s", "EXPORTED_RUNTIME_METHODS=$($env:EXPORTED_RUNTIME_METHODS)",
    "-s", "ALLOW_MEMORY_GROWTH=1"
)

$process = Start-Process -FilePath $EMCC_CMD -ArgumentList $emccArgs -PassThru -NoNewWindow

Show-Progress -ProcessId $process.Id

$process.WaitForExit()

if ($process.ExitCode -ne 0) {
    Write-Host "Build failed with exit code $($process.ExitCode)" -ForegroundColor Red
    exit $process.ExitCode
}

Write-Host "Build C++ code done!" -ForegroundColor Green
Write-Host "Build done!" -ForegroundColor Cyan

