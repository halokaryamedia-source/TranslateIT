param(
    [switch]$AllowCpuFallback,
    [switch]$NoLaunchApp,
    [ValidateRange(30, 600)]
    [int]$WorkerTimeoutSeconds = 300
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ($env:OS -ne "Windows_NT") {
    throw "TranslateIT local acceptance must run on Windows."
}

$AppRoot = Split-Path -Parent $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $AppRoot "..\..\..")).Path
$BuildScript = Join-Path $PSScriptRoot "build_release.ps1"
$AcceptanceScript = Join-Path $PSScriptRoot "run_target_pc_acceptance.ps1"
$ReleaseDir = Join-Path $AppRoot "src-tauri\target\translateit-release"
$SetupPath = Join-Path $ReleaseDir "TranslateIT-Setup.exe"
$ResumeStatePath = Join-Path $AppRoot "src-tauri\target\translateit-local-test-resume.json"
$SessionPath = Join-Path $AppRoot "src-tauri\target\translateit-local-test-session.json"
$ShellExe = (Get-Process -Id $PID).Path
$RunOnceName = "TranslateITLocalAcceptanceResume"
$RunOncePath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce"

function Read-JsonFile {
    param([string]$Path)
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
}

function Get-SourceState {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if ($null -eq $git) {
        throw "Git is required on the development/test machine so the release can be bound to the exact Local commit."
    }

    $branch = (& $git.Source -C $RepoRoot rev-parse --abbrev-ref HEAD 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not resolve the current Git branch." }
    $commit = (& $git.Source -C $RepoRoot rev-parse HEAD 2>&1 | Out-String).Trim().ToLowerInvariant()
    if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') {
        throw "Could not resolve the current Git commit."
    }
    $tracked = (& $git.Source -C $RepoRoot status --porcelain --untracked-files=no 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw "Could not inspect the tracked working-tree state." }

    return [ordered]@{
        branch = $branch
        commit = $commit
        clean = [string]::IsNullOrWhiteSpace($tracked)
        tracked_changes = $tracked
    }
}

function Require-CurrentLocalSource {
    $source = Get-SourceState
    if ([string]$source.branch -ne "Local") {
        throw "Local acceptance must run from branch Local. Current branch: $($source.branch)"
    }
    if (-not [bool]$source.clean) {
        throw "Tracked source changes are present. Commit/revert them before release acceptance: $($source.tracked_changes)"
    }
    return $source
}

function Write-Session {
    param(
        [string]$Status,
        [string]$Stage,
        [string]$SourceCommit,
        [string]$InstallRoot = "",
        [string]$Detail = ""
    )
    $manual = @(
        "Confirm installed TranslateIT first launch has no missing-runtime/dependency error.",
        "Complete/listen to My Voice and judge voice quality manually.",
        "Run Microphone Test with the real physical microphone.",
        "Verify TranslateIT Meeting Microphone in Zoom, Google Meet, or Teams.",
        "Repeat Meeting Start/Stop at least twice and confirm no stale/duplicate audio.",
        "Uninstall/reinstall and clean-machine acceptance remain separate final proof."
    )
    $body = [ordered]@{
        schema = "translateit.local_test_session.v1"
        updated_at = (Get-Date).ToUniversalTime().ToString("o")
        status = $Status
        stage = $Stage
        source_commit = $SourceCommit
        install_root = $InstallRoot
        allow_cpu_fallback = [bool]$AllowCpuFallback
        detail = $Detail
        preinstall_evidence = Join-Path $AppRoot "src-tauri\target\translateit-target-pc-preinstall.json"
        installed_runtime_evidence = Join-Path $AppRoot "src-tauri\target\translateit-target-pc-installed-runtime.json"
        manual_remaining = $manual
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $SessionPath -Parent) | Out-Null
    $body | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $SessionPath -Encoding UTF8
}

function Invoke-ChildPowerShell {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments = @()
    )
    if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
        throw "Required PowerShell helper is missing: $ScriptPath"
    }
    & $ShellExe -NoLogo -NoProfile -ExecutionPolicy Bypass -File $ScriptPath @Arguments
    $code = $LASTEXITCODE
    if ($code -ne 0) {
        throw "PowerShell helper failed with exit code ${code}: $ScriptPath"
    }
}

function Resolve-InstalledRoot {
    $candidates = New-Object System.Collections.Generic.List[string]
    foreach ($registryPath in @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )) {
        try {
            Get-ItemProperty $registryPath -ErrorAction SilentlyContinue |
                Where-Object { [string]$_.DisplayName -eq "TranslateIT" } |
                ForEach-Object {
                    $location = [string]$_.InstallLocation
                    if (-not [string]::IsNullOrWhiteSpace($location)) {
                        $candidates.Add($location.Trim('"'))
                    }
                }
        } catch {}
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles "TranslateIT"))
    }
    if (-not [string]::IsNullOrWhiteSpace(${env:ProgramFiles(x86)})) {
        $candidates.Add((Join-Path ${env:ProgramFiles(x86)} "TranslateIT"))
    }

    foreach ($candidate in @($candidates | Select-Object -Unique)) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $manifest = Join-Path $candidate "EngineData\Backend\TRANSLATEIT_INSTALLED_RUNTIME.json"
        if (Test-Path -LiteralPath $manifest -PathType Leaf) {
            return [IO.Path]::GetFullPath($candidate)
        }
    }
    return ""
}

function Get-RestartState {
    param([string]$InstallRoot)
    $manifestPath = Join-Path $InstallRoot "EngineData\Backend\TRANSLATEIT_INSTALLED_RUNTIME.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        return [ordered]@{ required = $false; pending = $false; detail = "Installed runtime manifest not found." }
    }
    $manifest = Read-JsonFile $manifestPath
    if (-not [bool]$manifest.vb_cable_restart_required) {
        return [ordered]@{ required = $false; pending = $false; detail = "VB-CABLE was already present or did not require a new-driver restart." }
    }
    try {
        $installedUtc = [DateTime]::Parse([string]$manifest.installed_utc).ToUniversalTime()
        $lastBoot = (Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).LastBootUpTime.ToUniversalTime()
        $pending = $lastBoot -le $installedUtc
        return [ordered]@{
            required = $true
            pending = $pending
            detail = "installed=$($installedUtc.ToString('o')); last_boot=$($lastBoot.ToString('o'))"
        }
    } catch {
        return [ordered]@{ required = $true; pending = $true; detail = "Could not prove the required restart: $($_.Exception.Message)" }
    }
}

function Save-ResumeState {
    param([string]$SourceCommit, [string]$InstallRoot)
    $state = [ordered]@{
        schema = "translateit.local_test_resume.v1"
        source_commit = $SourceCommit
        install_root = $InstallRoot
        allow_cpu_fallback = [bool]$AllowCpuFallback
        no_launch_app = [bool]$NoLaunchApp
        created_at = (Get-Date).ToUniversalTime().ToString("o")
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $ResumeStatePath -Parent) | Out-Null
    $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $ResumeStatePath -Encoding UTF8
}

function Clear-ResumeState {
    Remove-Item -LiteralPath $ResumeStatePath -Force -ErrorAction SilentlyContinue
    try { Remove-ItemProperty -Path $RunOncePath -Name $RunOnceName -ErrorAction SilentlyContinue } catch {}
}

function Register-AutoResume {
    $parts = New-Object System.Collections.Generic.List[string]
    $parts.Add('"' + $ShellExe + '"')
    $parts.Add('-NoLogo')
    $parts.Add('-NoProfile')
    $parts.Add('-ExecutionPolicy')
    $parts.Add('Bypass')
    $parts.Add('-File')
    $parts.Add('"' + $PSCommandPath + '"')
    if ($AllowCpuFallback) { $parts.Add('-AllowCpuFallback') }
    if ($NoLaunchApp) { $parts.Add('-NoLaunchApp') }
    $parts.Add('-WorkerTimeoutSeconds')
    $parts.Add([string]$WorkerTimeoutSeconds)
    New-Item -Path $RunOncePath -Force | Out-Null
    Set-ItemProperty -Path $RunOncePath -Name $RunOnceName -Value ($parts -join ' ') -Type String
}

function Run-InstalledRuntimeAcceptance {
    param([string]$SourceCommit, [string]$InstallRoot)

    Write-Host ""
    Write-Host "[local-test] Installed runtime / CUDA / MiLMMT acceptance..."
    Write-Session "in_progress" "installed_runtime" $SourceCommit $InstallRoot

    $args = @(
        "-Phase", "InstalledRuntime",
        "-InstallRoot", $InstallRoot,
        "-WorkerTimeoutSeconds", [string]$WorkerTimeoutSeconds
    )
    if ($AllowCpuFallback) { $args += "-AllowCpuFallback" }
    Invoke-ChildPowerShell $AcceptanceScript $args

    Clear-ResumeState
    Write-Session "automated_core_pass_manual_pending" "manual_product_checks" $SourceCommit $InstallRoot "Automated installed-runtime, CUDA/MiLMMT, ASR, dependency, and VB-CABLE checks passed."

    if (-not $NoLaunchApp) {
        $appExe = Join-Path $InstallRoot "TranslateIT.exe"
        if (Test-Path -LiteralPath $appExe -PathType Leaf) {
            Write-Host "[local-test] Launching installed TranslateIT for manual audio/product checks..."
            Start-Process -FilePath $appExe | Out-Null
        }
    }

    Write-Host ""
    Write-Host "============================================================"
    Write-Host "AUTOMATED CORE LOCAL TEST: PASS"
    Write-Host "============================================================"
    Write-Host "Evidence: $SessionPath"
    Write-Host "Next manual checks inside the app:"
    Write-Host "  1. First launch has no missing-runtime/dependency error."
    Write-Host "  2. My Voice build/listening quality."
    Write-Host "  3. Microphone Test with the physical microphone."
    Write-Host "  4. Meeting Microphone in Zoom / Meet / Teams."
    Write-Host "  5. Meeting Start/Stop twice without stale/duplicate audio."
    Write-Host "Uninstall/reinstall and clean-machine proof remain final acceptance."
}

$source = Require-CurrentLocalSource
Write-Host "[local-test] Local source: $($source.commit)"

$resume = $null
if (Test-Path -LiteralPath $ResumeStatePath -PathType Leaf) {
    try { $resume = Read-JsonFile $ResumeStatePath } catch { Clear-ResumeState }
}

if ($null -ne $resume) {
    $resumeCommit = [string]$resume.source_commit
    $resumeRoot = [string]$resume.install_root
    if ($resumeCommit -ne [string]$source.commit -or [string]::IsNullOrWhiteSpace($resumeRoot)) {
        Write-Warning "Stale local-test resume state does not match current Local. Starting a fresh build/install run."
        Clear-ResumeState
        $resume = $null
    } elseif (-not (Test-Path -LiteralPath (Join-Path $resumeRoot "EngineData\Backend\TRANSLATEIT_INSTALLED_RUNTIME.json") -PathType Leaf)) {
        Write-Warning "Saved install root is no longer valid. Starting a fresh build/install run."
        Clear-ResumeState
        $resume = $null
    }
}

if ($null -ne $resume) {
    $installRoot = [IO.Path]::GetFullPath([string]$resume.install_root)
    $restart = Get-RestartState $installRoot
    if ([bool]$restart.pending) {
        Write-Session "restart_required" "waiting_for_restart" ([string]$source.commit) $installRoot ([string]$restart.detail)
        throw "Windows restart is still required before runtime acceptance. Restart Windows, then run the same PowerShell command again."
    }
    Run-InstalledRuntimeAcceptance ([string]$source.commit) $installRoot
    exit 0
}

Write-Host ""
Write-Host "[local-test] 1/4 Building the current Local release pair..."
Write-Session "in_progress" "build_release" ([string]$source.commit)
Invoke-ChildPowerShell $BuildScript

Write-Host ""
Write-Host "[local-test] 2/4 Validating Setup + Payload before install..."
Write-Session "in_progress" "preinstall" ([string]$source.commit)
Invoke-ChildPowerShell $AcceptanceScript @("-Phase", "PreInstall")

if (-not (Test-Path -LiteralPath $SetupPath -PathType Leaf)) {
    throw "Release Setup is missing after build: $SetupPath"
}

Write-Host ""
Write-Host "[local-test] 3/4 Launching TranslateIT Setup. Accept the normal Windows UAC/driver prompts if you want to continue."
Write-Session "in_progress" "installer" ([string]$source.commit)
try {
    $setupProcess = Start-Process -FilePath $SetupPath -Verb RunAs -Wait -PassThru
} catch {
    Write-Session "failed" "installer" ([string]$source.commit) "" $_.Exception.Message
    throw
}
if ($setupProcess.ExitCode -notin @(0, 3010, 1641)) {
    Write-Session "failed" "installer" ([string]$source.commit) "" "Setup exit code $($setupProcess.ExitCode)"
    throw "TranslateIT Setup failed or was cancelled (exit $($setupProcess.ExitCode))."
}

$installRoot = ""
for ($attempt = 0; $attempt -lt 15 -and [string]::IsNullOrWhiteSpace($installRoot); $attempt++) {
    $installRoot = Resolve-InstalledRoot
    if ([string]::IsNullOrWhiteSpace($installRoot)) { Start-Sleep -Seconds 1 }
}
if ([string]::IsNullOrWhiteSpace($installRoot)) {
    Write-Session "failed" "installer" ([string]$source.commit) "" "Setup completed but installed runtime root could not be discovered."
    throw "Setup completed, but TranslateIT installation root could not be discovered."
}

$restart = Get-RestartState $installRoot
if ([bool]$restart.pending) {
    Save-ResumeState ([string]$source.commit) $installRoot
    Write-Session "restart_required" "waiting_for_restart" ([string]$source.commit) $installRoot ([string]$restart.detail)
    Write-Host ""
    Write-Host "TranslateIT/VB-CABLE requires a Windows restart."
    $answer = Read-Host "Type R to restart now and resume this SAME test automatically after sign-in, or press Enter to restart manually later"
    if ($answer.Trim().ToUpperInvariant() -eq "R") {
        Register-AutoResume
        Write-Host "[local-test] Auto-resume registered. Windows will restart in 10 seconds."
        & (Join-Path $env:SystemRoot "System32\shutdown.exe") /r /t 10 /c "TranslateIT local acceptance will resume after sign-in."
        exit 3010
    }
    Write-Host "Restart Windows. After restart, run the SAME command again; the script will resume instead of rebuilding."
    exit 3010
}

Write-Host ""
Write-Host "[local-test] 4/4 Running installed runtime / CUDA / MiLMMT acceptance..."
Run-InstalledRuntimeAcceptance ([string]$source.commit) $installRoot
