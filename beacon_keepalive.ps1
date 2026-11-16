$file = "D:\codex-audio\dist\index.html"
$slug = "aura-audtex"
$token = "ctk_zCIp16zLN4Ok31ZMPxuaak9rjM7nFiRZDT11LUpfPB8"

if (-not (Test-Path $file)) {
    exit
}

try {
    $code = (curl.exe -s -o NUL -w "%{http_code}" "https://$slug.beacon.host/")
    if ($code -ne "200") {
        curl.exe -sS https://beacon.host/v1/publish -H "X-Claim-Token: $token" -F "file=@$file" -F "slug=$slug" | Out-Null
    }
} catch {
    curl.exe -sS https://beacon.host/v1/publish -H "X-Claim-Token: $token" -F "file=@$file" -F "slug=$slug" | Out-Null
}
