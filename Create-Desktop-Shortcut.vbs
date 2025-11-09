' Team Claude Dashboard - Desktop Shortcut Creator
' Ai-Solutions.Store Platform
' 50% to Shriners Children's Hospitals

Set WshShell = WScript.CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get script directory
ScriptPath = WScript.ScriptFullName
ScriptDir = objFSO.GetParentFolderName(ScriptPath)

' Get Desktop path
DesktopPath = WshShell.SpecialFolders("Desktop")

' Create shortcuts for both launchers
' 1. Batch File Launcher
BatchPath = ScriptDir & "\TEAM-CLAUDE-LAUNCHER.bat"
If objFSO.FileExists(BatchPath) Then
    Set Shortcut = WshShell.CreateShortcut(DesktopPath & "\Team Claude Dashboard.lnk")
    Shortcut.TargetPath = BatchPath
    Shortcut.WorkingDirectory = ScriptDir
    Shortcut.Description = "Team Claude Dashboard - 50% to Shriners"
    Shortcut.IconLocation = "%SystemRoot%\System32\SHELL32.dll,13"
    Shortcut.Save

    MsgBox "Desktop shortcut created!" & vbCrLf & vbCrLf & _
           "Location: " & DesktopPath & "\Team Claude Dashboard.lnk" & vbCrLf & vbCrLf & _
           "Double-click to launch Team Claude Dashboard!" & vbCrLf & vbCrLf & _
           "💙 50% to Shriners Children's Hospitals", _
           vbInformation, "Team Claude - Shortcut Created"
Else
    MsgBox "ERROR: Launcher file not found!" & vbCrLf & vbCrLf & _
           "Expected: " & BatchPath, _
           vbCritical, "Team Claude - Error"
End If

' 2. PowerShell Launcher (alternative)
PS1Path = ScriptDir & "\TEAM-CLAUDE-LAUNCHER.ps1"
If objFSO.FileExists(PS1Path) Then
    Set Shortcut2 = WshShell.CreateShortcut(DesktopPath & "\Team Claude Dashboard (PowerShell).lnk")
    Shortcut2.TargetPath = "powershell.exe"
    Shortcut2.Arguments = "-ExecutionPolicy Bypass -NoProfile -File """ & PS1Path & """"
    Shortcut2.WorkingDirectory = ScriptDir
    Shortcut2.Description = "Team Claude Dashboard - PowerShell Launcher"
    Shortcut2.IconLocation = "%SystemRoot%\System32\SHELL32.dll,13"
    Shortcut2.Save
End If
