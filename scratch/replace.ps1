Get-ChildItem -Filter *.html | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace 'href="index\.html"', 'href="/"'
    Set-Content -NoNewline -Path $_.FullName -Value $content
}
