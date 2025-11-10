# Create Desktop Icon for Team Claude Fund Generator

$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = "$Desktop\Team Claude Fund Generator.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"c:\Users\T5500PRECISION\trollz1004\launcher\one-click-launcher-ai.ps1`""
$Shortcut.WorkingDirectory = "c:\Users\T5500PRECISION\trollz1004"
$Shortcut.IconLocation = "c:\Users\T5500PRECISION\trollz1004\launcher\icon.ico"
$Shortcut.Description = "Team Claude For The Kids - 1-Click Fund Generator"
$Shortcut.Save()

Write-Host "Desktop icon created successfully!" -ForegroundColor Green
Write-Host "Location: $ShortcutPath" -ForegroundColor Cyan
