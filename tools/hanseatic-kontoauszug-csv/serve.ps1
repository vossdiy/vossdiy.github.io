# Minimaler lokaler Static-File-Server nur für die Entwicklung/Vorschau.
# Für den produktiven Einsatz reicht jedes statische Hosting (z. B. Codeberg Pages) -
# dieses Skript wird dafuer nicht benoetigt.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8123

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port/"

$mimeMap = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".mjs"  = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".pdf"  = "application/pdf"
  ".map"  = "application/json"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $request = $context.Request
  $response = $context.Response
  try {
    $path = $request.Url.AbsolutePath
    if ($path -eq "/") { $path = "/index.html" }
    $relative = $path.TrimStart("/") -replace "/", "\"
    $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

    if (-not $filePath.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
      $response.StatusCode = 403
    }
    elseif (Test-Path $filePath -PathType Leaf) {
      $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
      $contentType = $mimeMap[$ext]
      if (-not $contentType) { $contentType = "application/octet-stream" }
      $bytes = [System.IO.File]::ReadAllBytes($filePath)
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    else {
      $response.StatusCode = 404
      $notFound = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
      $response.OutputStream.Write($notFound, 0, $notFound.Length)
    }
  }
  catch {
    $response.StatusCode = 500
  }
  finally {
    $response.Close()
  }
}
