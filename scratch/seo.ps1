Get-ChildItem -Filter *.html | ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    
    # Replace og:image
    $c = $c -replace '<meta property="og:image" content="https://www.ddsmarine.com/assets/[^"]+"/>', '<meta property="og:image" content="https://www.ddsmarine.com/assets/dds-logo-gold.png"/>'
    
    # Replace twitter:image
    $c = $c -replace '<meta name="twitter:image" content="https://www.ddsmarine.com/assets/[^"]+"/>', '<meta name="twitter:image" content="https://www.ddsmarine.com/assets/dds-logo-gold.png"/>'

    # Add extra og tags if not present
    if ($c -notmatch 'og:image:width') {
        $c = $c -replace '<meta property="og:image:alt" content="DDS Marine Energy Services"/>', "<meta property=`"og:image:alt`" content=`"DDS Marine Energy Services`"/>`r`n    <meta property=`"og:image:type`" content=`"image/png`"/>`r`n    <meta property=`"og:image:width`" content=`"600`"/>`r`n    <meta property=`"og:image:height`" content=`"600`"/>"
    }

    # Add apple-touch-icon if not present
    if ($c -notmatch 'apple-touch-icon') {
        $c = $c -replace '<link rel="icon" type="image/png" href="assets/dds-logo-gold.png"/>', "<link rel=`"icon`" type=`"image/png`" href=`"assets/dds-logo-gold.png`"/>`r`n    <link rel=`"apple-touch-icon`" href=`"assets/dds-logo-gold.png`"/>"
    }

    Set-Content -NoNewline -Path $_.FullName -Value $c
}
