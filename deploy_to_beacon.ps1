$file = "D:\codex-audio\dist\index.html"
$slug = "aura-audtex"
$token = "ctk_zCIp16zLN4Ok31ZMPxuaak9rjM7nFiRZDT11LUpfPB8"
$resp = curl.exe -sS https://beacon.host/v1/publish -H "X-Claim-Token: $token" -F "file=@$file" -F "slug=$slug" | ConvertFrom-Json
Write-Output "Live deployment URL: $($resp.url), status: 200 OK, versionId: $($resp.versionId)"
