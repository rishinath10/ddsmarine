# scratch/audit_links_casing.ps1
$htmlFiles = Get-ChildItem -Filter *.html
$mismatchCount = 0

# Get a case-sensitive list of files on disk
$filesOnDisk = @{}
foreach ($file in $htmlFiles) {
    $filesOnDisk[$file.Name] = $true
}

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    $hrefMatches = [regex]::Matches($content, 'href="([^"]+\.html)"')
    foreach ($match in $hrefMatches) {
        $href = $match.Groups[1].Value
        if ($href -like "http*") { continue }
        # Check case-sensitive match
        $found = $false
        foreach ($key in $filesOnDisk.Keys) {
            if ($key -clike $href) {
                $found = $true
                break
            }
        }
        if (-not $found) {
            Write-Host "  [LINK CASING MISMATCH] in $($file.Name): '$href' does not match actual casing on disk" -ForegroundColor Red
            $mismatchCount++
        }
    }
}

$color = if ($mismatchCount -eq 0) { "Green" } else { "Red" }
Write-Host "Link casing audit completed. Found $mismatchCount issues." -ForegroundColor $color
