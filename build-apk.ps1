# Build the APK end-to-end.
# ASCII only: Windows PowerShell 5.1 reads .ps1 as ANSI when there is no BOM.
# Note: $ErrorActionPreference stays 'Continue' on purpose -- native tools write to stderr
# (e.g. "Picked up JAVA_TOOL_OPTIONS") and 'Stop' would abort the script on that.

$ErrorActionPreference = 'Continue'
$app = $PSScriptRoot
$root = Split-Path $app -Parent
$build = 'D:\suwo-build'
$sdk = Join-Path $build 'sdk'
$env:SUWO_BUILD = $build
$ProgressPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Step($n, $t) {
    Write-Host ""
    Write-Host "[$n] $t" -ForegroundColor Cyan
}

function Fail($msg) {
    Write-Host ""
    Write-Host "!! $msg" -ForegroundColor Red
    exit 1
}

function Test-Zip($path) {
    if (-not (Test-Path $path)) { return $false }
    try {
        $z = [System.IO.Compression.ZipFile]::OpenRead($path)
        $count = $z.Entries.Count
        $z.Dispose()
        return ($count -gt 0)
    } catch {
        return $false
    }
}

function Expand-Zip($path, $dest) {
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    [System.IO.Compression.ZipFile]::ExtractToDirectory($path, $dest)
}

Step 1 "Prepare folders"
New-Item -ItemType Directory -Force -Path $build, $sdk | Out-Null

Step 2 "Download JDK 17 + Android cmdline-tools + Gradle (about 540 MB, via Node)"
$jdkZip = Join-Path $build 'jdk17.zip'
$cmdZip = Join-Path $build 'cmdline-tools.zip'
$gradleZip = Join-Path $build 'gradle-8.14.3-all.zip'
$jdk21Zip = Join-Path $build 'jdk21.zip'

for ($attempt = 1; $attempt -le 2; $attempt++) {
    Push-Location $root
    & node .build\download.cjs
    Pop-Location

    $bad = @()
    if (-not (Test-Zip $jdkZip)) { $bad += $jdkZip }
    if (-not (Test-Zip $cmdZip)) { $bad += $cmdZip }
    if (-not (Test-Zip $gradleZip)) { $bad += $gradleZip }
    if (-not (Test-Zip $jdk21Zip)) { $bad += $jdk21Zip }
    if ($bad.Count -eq 0) { break }

    foreach ($f in $bad) {
        Write-Host "  broken download, removing: $f" -ForegroundColor Yellow
        Remove-Item $f -Force -ErrorAction SilentlyContinue
        Remove-Item ($f + '.ok') -Force -ErrorAction SilentlyContinue
    }
    if ($attempt -eq 2) { Fail "download failed twice. Check your network and run again." }
}

Step 3 "Unzip cmdline-tools"
$ct = Join-Path $sdk 'cmdline-tools\latest'
if (-not (Test-Path $ct)) {
    $tmp = Join-Path $build 'ct-tmp'
    Expand-Zip $cmdZip $tmp
    New-Item -ItemType Directory -Force -Path (Join-Path $sdk 'cmdline-tools') | Out-Null
    Move-Item (Join-Path $tmp 'cmdline-tools') $ct -Force
    Remove-Item $tmp -Recurse -Force
}

Step 4 "Unzip JDKs (need 21 for Capacitor 8)"
foreach ($pair in @(@($jdkZip, 'jdk-17*', 'jdk-tmp'), @($jdk21Zip, 'jdk-21*', 'jdk21-tmp'))) {
    $zipPath = $pair[0]
    $pattern = $pair[1]
    $tmpName = $pair[2]
    if (-not (Test-Path $zipPath)) { continue }
    $found = Get-ChildItem $build -Directory | Where-Object { $_.Name -like $pattern } | Select-Object -First 1
    if ($found) { continue }
    $tmp = Join-Path $build $tmpName
    Expand-Zip $zipPath $tmp
    $inner = Get-ChildItem $tmp -Directory | Select-Object -First 1
    Move-Item $inner.FullName (Join-Path $build $inner.Name) -Force
    Remove-Item $tmp -Recurse -Force
}
$jdkDir = Get-ChildItem $build -Directory | Where-Object { $_.Name -like 'jdk-21*' } | Select-Object -First 1
if (-not $jdkDir) { $jdkDir = Get-ChildItem $build -Directory | Where-Object { $_.Name -like 'jdk-17*' } | Select-Object -First 1 }
if (-not $jdkDir) { Fail "no JDK found after unzip" }
$env:JAVA_HOME = $jdkDir.FullName
$env:PATH = "$($jdkDir.FullName)\bin;$env:PATH"
$env:JAVA_TOOL_OPTIONS = "-Dfile.encoding=UTF-8"
Write-Host "  JAVA_HOME = $($env:JAVA_HOME)"

Step 5 "Accept SDK licenses and install packages"
$sdkmanager = Join-Path $ct 'bin\sdkmanager.bat'
if (-not (Test-Path $sdkmanager)) { Fail "sdkmanager not found: $sdkmanager" }

# Feed "y" through stdin via cmd redirection -- piping in PowerShell does not work for .bat
$yesFile = Join-Path $build 'yes.txt'
$lines = New-Object System.Collections.Generic.List[string]
1..200 | ForEach-Object { $lines.Add('y') }
[System.IO.File]::WriteAllLines($yesFile, $lines)

Write-Host "  accepting licenses..."
cmd /c "`"$sdkmanager`" --sdk_root=`"$sdk`" --licenses < `"$yesFile`""
Write-Host "  installing platform-tools / platforms;android-36 / build-tools;36.0.0 ..."
cmd /c "`"$sdkmanager`" --sdk_root=`"$sdk`" platform-tools `"platforms;android-36`" `"build-tools;36.0.0`" < `"$yesFile`""

$platformJar = Join-Path $sdk 'platforms\android-36\android.jar'
$aapt2 = Join-Path $sdk 'build-tools\36.0.0\aapt2.exe'
if (-not (Test-Path $platformJar)) { Fail "Android SDK platform 36 is NOT installed. See sdkmanager output above." }
if (-not (Test-Path $aapt2)) { Fail "Android build-tools 36.0.0 is NOT installed. See sdkmanager output above." }
Write-Host "  SDK components OK"

Step 6 "Copy project to an ASCII-only path (AGP refuses non-ASCII paths)"
$proj = Join-Path $build 'project'
$projAndroid = Join-Path $proj 'android'
if (Test-Path $proj) { Remove-Item $proj -Recurse -Force }
New-Item -ItemType Directory -Force -Path $proj | Out-Null

robocopy $app $proj /E /XD node_modules build .gradle .idea /NFL /NDL /NJH /NJS /NP | Out-Null
Write-Host "  copied project files"

$capSrc = Join-Path $app 'node_modules\@capacitor'
$capDst = Join-Path $proj 'node_modules\@capacitor'
if (Test-Path $capSrc) {
    New-Item -ItemType Directory -Force -Path $capDst | Out-Null
    robocopy $capSrc $capDst /E /NFL /NDL /NJH /NJS /NP | Out-Null
    Write-Host "  copied @capacitor modules"
} else {
    Fail "node_modules\@capacitor not found - run npm install first"
}
if (-not (Test-Path (Join-Path $projAndroid 'settings.gradle'))) { Fail "copy failed: settings.gradle missing" }

Step 7 "Write local.properties"
$sdkEsc = $sdk.Replace('\', '\\')
# Signing passwords are not hardcoded here: copy the suwo.* keys from the project local.properties
# (gitignored). The staging dir is rebuilt each run, so it must be re-applied or release falls back to debug signing.
$lpText = "sdk.dir=$sdkEsc`r`n"
$signingSrc = Join-Path $app 'android\local.properties'
if (Test-Path $signingSrc) {
    $suwoLines = @(Get-Content $signingSrc | Where-Object { $_ -match '^suwo\.' })
    if ($suwoLines.Count -gt 0) {
        $lpText += ($suwoLines -join "`r`n") + "`r`n"
        Write-Host ("  signing: " + $suwoLines.Count + " keys copied")
    } else {
        Write-Host "  WARN: no suwo.* signing keys in app\android\local.properties" -ForegroundColor Yellow
    }
}
[System.IO.File]::WriteAllText((Join-Path $projAndroid 'local.properties'), $lpText, [System.Text.Encoding]::ASCII)
Write-Host ("  sdk.dir written: " + $lpText.StartsWith('sdk.dir='))

Step 8 "Gradle build (first run downloads dependencies, 10-20 min)"
if (-not (Test-Zip $gradleZip)) { Fail "gradle-8.14.3-all.zip missing" }
$env:GRADLE_USER_HOME = Join-Path $build 'gradle-home'
$log = Join-Path $build 'build.log'

Push-Location $projAndroid
$output = & .\gradlew.bat assembleRelease --no-daemon --stacktrace --console=plain 2>&1
$code = $LASTEXITCODE
Pop-Location

$output | Out-File -FilePath $log -Encoding UTF8
Write-Host "  full log: $log"

if ($code -ne 0) {
    Write-Host ""
    Write-Host "===== BUILD ERROR (key lines) =====" -ForegroundColor Red
    $text = ($output | Out-String)
    $idx2 = $text.IndexOf('What went wrong')
    if ($idx2 -lt 0) { $idx2 = [Math]::Max(0, $text.Length - 2500) }
    Write-Host $text.Substring($idx2, [Math]::Min(2000, $text.Length - $idx2))
    Write-Host "===================================" -ForegroundColor Red
    Fail "gradle build failed"
}

$apk = Join-Path $projAndroid 'app\build\outputs\apk\release\app-release.apk'
Write-Host ""
if (Test-Path $apk) {
    # Version comes from build.gradle; output is named suwo-v{versionName}-code{versionCode}.apk
    $gradleFile = Join-Path $projAndroid 'app\build.gradle'
    $gradleText = Get-Content $gradleFile -Raw
    $mName = [regex]::Match($gradleText, 'versionName\s+"([^"]+)"')
    $mCode = [regex]::Match($gradleText, 'versionCode\s+(\d+)')
    if (-not $mName.Success -or -not $mCode.Success) { Fail "cannot read versionName/versionCode from build.gradle" }
    $versionName = $mName.Groups[1].Value
    $versionCode = $mCode.Groups[1].Value
    $dest = Join-Path $root ("suwo-v{0}-code{1}.apk" -f $versionName, $versionCode)

    # The APK must be signed with the release cert: verify with apksigner and fail hard on mismatch
    $apksigner = Join-Path $sdk 'build-tools\36.0.0\apksigner.bat'
    if (Test-Path $apksigner) {
        $certOut = & cmd /c "`"$apksigner`" verify --print-certs `"$apk`"" 2>&1
        $certLine = ($certOut | Where-Object { $_ -match 'SHA-256' } | Select-Object -First 1)
        if (-not $certLine) { Fail "apksigner did not report a certificate: $certOut" }
        # apksigner prints a bare 64-char hex digest (no colons)
        $certSha = [regex]::Match($certLine, '[0-9a-fA-F]{64}').Value
        $expected = '09:27:46:07:4E:C9:9D:27:46:DD:CF:9F:B3:40:9F:A5:A3:37:E6:46:DF:DD:18:46:0B:6E:B6:91:52:8B:F3:FE'
        $expectedHex = $expected.Replace(':', '').ToUpper()
        if (-not $certSha -or $certSha.ToUpper() -ne $expectedHex) {
            Fail "APK signed with unexpected certificate: '$certSha' (expected $expectedHex)"
        }
        Write-Host ("  signing cert SHA-256: " + $certSha) -ForegroundColor Green
    } else {
        Write-Host "  WARN: apksigner not found, skipped signature check" -ForegroundColor Yellow
    }

    Copy-Item $apk $dest -Force
    $sha = (Get-FileHash -LiteralPath $dest -Algorithm SHA256).Hash
    Write-Host "SUCCESS - APK created:" -ForegroundColor Green
    Write-Host "  $dest" -ForegroundColor Green
    Write-Host ("  bytes: " + (Get-Item $dest).Length + "  sha256: " + $sha)
    Write-Host "Next: run the send-to-phone script."
} else {
    Fail "gradle finished but app-release.apk was not found"
}