$ErrorActionPreference = 'Stop'
$originalPath = [IO.Path]::GetFullPath('F:\aegis-unified\Bizbetter')
if ($originalPath -ne 'F:\aegis-unified\Bizbetter') { throw 'Unexpected target' }
for ($attempt = 0; $attempt -lt 720; $attempt++) {
    if (-not [IO.Directory]::Exists($originalPath)) { exit 0 }
    if (@(Get-ChildItem -LiteralPath $originalPath -Force).Count -ne 0) { throw 'Directory is not empty; refusing cleanup' }
    try { [IO.Directory]::Delete($originalPath, $false); exit 0 } catch [IO.IOException] { } catch [UnauthorizedAccessException] { }
    Start-Sleep -Seconds 5
}
