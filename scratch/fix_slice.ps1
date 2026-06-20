Get-ChildItem -Filter *.html | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    $c = $c -replace "<span class='text-gold-gradient italic'>", '<span class="text-gold-gradient italic" style="padding-right: 0.15em;">'
    Set-Content -NoNewline -Path $_.FullName -Value $c
}
