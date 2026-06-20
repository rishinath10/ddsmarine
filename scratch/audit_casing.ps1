# scratch/audit_casing.ps1
$files = Get-ChildItem -Path assets -File
$assets = @{}
foreach ($f in $files) {
    $assets[$f.Name] = $true
}

$htmlFiles = Get-ChildItem -Filter *.html
$mismatchCount = 0

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $srcs = [regex]::Matches($content, 'src="assets/([^"]+)"')
    foreach ($match in $srcs) {
        $srcName = $match.Groups[1].Value
        # Check case-sensitive existence
        $found = $false
        foreach ($key in $assets.Keys) {
            if ($key -clike $srcName) {
                $found = $true
                break
            }
        }
        if (-not $found) {
            # Let's check case-insensitive existence to see if it's just a casing issue
            $insensitiveFound = $false
            $correctCasing = ""
            foreach ($key in $assets.Keys) {
                if ($key.ToLower() -eq $srcName.ToLower()) {
                    $insensitiveFound = $true
                    $correctCasing = $key
                    break
                }
            }
            if ($insensitiveFound) {
                Write-Host "  [CASING MISMATCH] in $($file.Name): 'assets/$srcName' should be 'assets/$correctCasing'" -ForegroundColor Red
                $mismatchCount++
            } else {
                Write-Host "  [MISSING IMAGE] in $($file.Name): 'assets/$srcName' does not exist on disk" -ForegroundColor Red
                $mismatchCount++
            }
        }
    }
}

$color = if ($mismatchCount -eq 0) { "Green" } else { "Red" }
Write-Host "Audit completed. Found $mismatchCount issues." -ForegroundColor $color
