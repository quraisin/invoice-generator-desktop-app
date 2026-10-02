$ws = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktop "Invoice Master.lnk"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $scriptDir "Jalankan_Aplikasi.bat"

$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $target
$shortcut.WorkingDirectory = $scriptDir
$shortcut.IconLocation = "shell32.dll,260"
$shortcut.Description = "Sistem Generator Invoice Desktop"
$shortcut.Save()

if (Test-Path $shortcutPath) {
    Write-Host "[SUKSES] Shortcut 'Invoice Master' berhasil dibuat di Desktop Windows!"
} else {
    Write-Host "[GAGAL] Tidak dapat membuat shortcut di Desktop."
}
