# =====================================================================
#  Fiona — kleiner Webserver zum Ausprobieren
#  =====================================================================
#
#  WOZU DAS GUT IST
#
#  Wenn man index.html einfach doppelklickt, läuft die Seite als
#  "file://..." — und dort merkt sich Chrome KEINE Mikrofon-Freigabe.
#  Ergebnis: bei jeder einzelnen Frage kommt die Abfrage neu.
#
#  Über "http://localhost" ist das anders: Chrome behandelt localhost als
#  sicheren Ursprung, speichert die Freigabe und fragt genau EINMAL.
#
#  Dieses Skript liefert den Ordner unter http://localhost:8080 aus.
#  Zum Beenden: einfach das schwarze Fenster schließen.
#
#  Es wird nichts installiert und nichts ins Internet gestellt. Der Server
#  ist nur auf diesem Rechner erreichbar.
# =====================================================================

$ErrorActionPreference = 'Stop'

$port = 8080
$wurzel = $PSScriptRoot
$adresse = "http://localhost:$port/"

$typen = @{
  '.html' = 'text/html; charset=utf-8'
  '.htm'  = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.txt'  = 'text/plain; charset=utf-8'
  '.md'   = 'text/plain; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

$horcher = New-Object System.Net.HttpListener
$horcher.Prefixes.Add($adresse)

try {
  $horcher.Start()
} catch {
  Write-Host ''
  Write-Host '  Der Server konnte nicht starten.' -ForegroundColor Red
  Write-Host "  Moeglicherweise ist Port $port schon belegt."
  Write-Host '  Schliesse ein eventuell offenes Fiona-Fenster und versuche es erneut.'
  Write-Host ''
  Read-Host '  Zum Beenden Enter druecken'
  exit 1
}

Write-Host ''
Write-Host '  ============================================================'
Write-Host '   Fiona laeuft.' -ForegroundColor Green
Write-Host ''
Write-Host "   Adresse:  $adresse"
Write-Host ''
Write-Host '   Das Browserfenster oeffnet sich gleich von selbst.'
Write-Host '   Die Mikrofon-Freigabe wird jetzt nur EINMAL abgefragt.'
Write-Host ''
Write-Host '   Zum Beenden: dieses Fenster schliessen.'
Write-Host '  ============================================================'
Write-Host ''

Start-Process $adresse

while ($horcher.IsListening) {
  try {
    $anfrage = $horcher.GetContext()
  } catch {
    break
  }

  $pfad = [System.Uri]::UnescapeDataString($anfrage.Request.Url.LocalPath).TrimStart('/')
  if ([string]::IsNullOrWhiteSpace($pfad)) { $pfad = 'index.html' }

  # Nur Dateien aus diesem Ordner ausliefern, nichts darueber hinaus.
  $datei = Join-Path $wurzel $pfad
  $voll = [System.IO.Path]::GetFullPath($datei)

  $antwort = $anfrage.Response

  if ($voll.StartsWith($wurzel) -and (Test-Path -LiteralPath $voll -PathType Leaf)) {
    $endung = [System.IO.Path]::GetExtension($voll).ToLower()
    $typ = $typen[$endung]
    if (-not $typ) { $typ = 'application/octet-stream' }

    $inhalt = [System.IO.File]::ReadAllBytes($voll)
    $antwort.ContentType = $typ
    $antwort.ContentLength64 = $inhalt.Length
    $antwort.OutputStream.Write($inhalt, 0, $inhalt.Length)
    Write-Host ("  200  " + $pfad)
  } else {
    $antwort.StatusCode = 404
    $fehler = [System.Text.Encoding]::UTF8.GetBytes('Nicht gefunden')
    $antwort.OutputStream.Write($fehler, 0, $fehler.Length)
    Write-Host ("  404  " + $pfad) -ForegroundColor DarkYellow
  }

  $antwort.OutputStream.Close()
}

$horcher.Stop()
