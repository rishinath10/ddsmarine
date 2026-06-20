# scratch/replace_logos.ps1
$htmlFiles = Get-ChildItem -Path . -Filter *.html

$replacement = @"
    <!-- WhatsApp Link -->
    <a href="https://wa.me/60165063003" target="_blank" rel="noopener noreferrer" 
       class="flex items-center gap-3 group">
      <span class="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-navy shadow-elegant opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">WhatsApp</span>
      <img src="assets/whatsapp-logo.png" alt="WhatsApp" class="h-12 w-12 rounded-full shadow-elegant hover:scale-110 transition-transform object-cover"/>
    </a>

    <!-- LinkedIn Link -->
    <a href="https://www.linkedin.com/company/dds-marine-energy" target="_blank" rel="noopener noreferrer" 
       class="flex items-center gap-3 group">
      <span class="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-navy shadow-elegant opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">LinkedIn</span>
      <img src="assets/linkedin-logo.png" alt="LinkedIn" class="h-12 w-12 rounded-full shadow-elegant hover:scale-110 transition-transform object-cover"/>
    </a>
"@

$pattern = '(?s) {4}<!-- WhatsApp Link -->.*?<!-- LinkedIn Link -->.*?</a>'

foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -match $pattern) {
        $newContent = [regex]::Replace($content, $pattern, $replacement)
        [System.IO.File]::WriteAllText($file.FullName, $newContent)
        Write-Host "Updated: $($file.Name)" -ForegroundColor Green
    } else {
        Write-Host "No match found in: $($file.Name)" -ForegroundColor Yellow
    }
}
