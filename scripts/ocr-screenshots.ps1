param([string]$OutFile = 'C:\Users\omara\AppData\Local\Temp\cline\session2-ocr.txt')

Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType = WindowsRuntime]

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
  Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]

function Await {
  param($WinRtTask, $ResultType)
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}

$files = Get-ChildItem 'C:\Users\omara\Desktop\red sh' -Filter *.jpeg | Sort-Object Name
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$arLang = [Windows.Globalization.Language]::new('ar')
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($arLang)
if ($null -eq $engine) {
  Write-Output 'NO ARABIC OCR ENGINE — falling back to user profile language'
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}
if ($null -eq $engine) { Write-Output 'NO OCR ENGINE AT ALL'; exit 1 }
Write-Output ("Engine language: " + $engine.RecognizerLanguage.LanguageTag)

$all = New-Object System.Text.StringBuilder
foreach ($f in $files) {
  try {
    $storageFile = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($f.FullName)) ([Windows.Storage.StorageFile])
    $stream = Await ($storageFile.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $ocrResult = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    [void]$all.AppendLine("===== " + $f.Name + " =====")
    [void]$all.AppendLine($ocrResult.Text)
    [void]$all.AppendLine("")
    Write-Output ("OCR OK: " + $f.Name + " → " + $ocrResult.Text.Length + " chars")
  } catch {
    Write-Output ("OCR FAILED: " + $f.Name + " → " + $_.Exception.Message)
  }
}

$all.ToString() | Out-File $OutFile -Encoding utf8
Write-Output ("WROTE " + $OutFile)
