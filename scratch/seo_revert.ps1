Get-ChildItem -Filter *.html | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    
    # Replace og:image back to hero-ship.jpg
    $c = $c -replace '<meta property="og:image" content="https://www.ddsmarine.com/assets/dds-logo-gold.png"/>', '<meta property="og:image" content="https://www.ddsmarine.com/assets/hero-ship.jpg"/>'
    
    # Replace twitter:image back to hero-ship.jpg
    $c = $c -replace '<meta name="twitter:image" content="https://www.ddsmarine.com/assets/dds-logo-gold.png"/>', '<meta name="twitter:image" content="https://www.ddsmarine.com/assets/hero-ship.jpg"/>'

    # Update the type and dimensions for the new landscape image
    $c = $c -replace '<meta property="og:image:type" content="image/png"/>', '<meta property="og:image:type" content="image/jpeg"/>'
    $c = $c -replace '<meta property="og:image:width" content="600"/>', '<meta property="og:image:width" content="1200"/>'
    $c = $c -replace '<meta property="og:image:height" content="600"/>', '<meta property="og:image:height" content="630"/>'

    Set-Content -NoNewline -Path $_.FullName -Value $c
}
