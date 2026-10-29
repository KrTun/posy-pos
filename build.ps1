# 把 index.html（Artifact 用的頁面本體）包成可以獨立放在 GitHub Pages 的 site\index.html。
# 只有一份程式碼：改 index.html -> 跑這支 -> 推 site\ 到 GitHub。
# This file MUST stay UTF-8 *with BOM*: PS 5.1 reads a non-BOM file as ANSI and eats the CJK below.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $root 'index.html'
$dst  = Join-Path $root 'docs\index.html'

$body = [IO.File]::ReadAllText($src, [Text.Encoding]::UTF8)

# These belong in a real <head>, so pull them out of the body before wrapping.
$body = $body -replace '(?m)^<title>.*?</title>\r?\n', ''
$body = $body -replace '(?m)^<meta name="claude:.*?>\r?\n', ''
$body = $body -replace '(?m)^<link rel="preconnect".*?>\r?\n', ''
$body = $body -replace '(?m)^<link rel="stylesheet" href="https://fonts\.googleapis.*?>\r?\n', ''

$head = @'
<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0f6b5c">
<meta name="description" content="Mobile till for a market stall: photo, item, amount, cash / transfer / LINE Pay.">
<title>手作攤收銀</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="手作攤收銀">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap">
<style>
/* Same reset the Artifact viewer injects, so one source file renders identically in both places. */
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
html,body{margin:0}
body{font:14px system-ui,-apple-system,sans-serif;background:#f1f2ef}
img{max-width:100%}
[hidden]{display:none!important}
</style>
</head>
<body>
'@

$tail = @'

<script>
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("sw.js").catch(function(){});
  });
}
</script>
</body>
</html>
'@

[IO.File]::WriteAllText($dst, ($head + $body + $tail), (New-Object Text.UTF8Encoding($false)))
"built: $dst  ($([math]::Round((Get-Item $dst).Length/1KB,1)) KB)"
