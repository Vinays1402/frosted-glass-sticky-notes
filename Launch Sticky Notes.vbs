' =========================================================================
' LIQUID GLASS STICKY NOTES - 100% SILENT LAUNCHER
' Launches directly into Windows GUI subsystem with zero console/cmd window
' =========================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir

strExe = strDir & "\node_modules\electron\dist\electron.exe"
If fso.FileExists(strExe) Then
    WshShell.Run """" & strExe & """ .", 0, False
Else
    WshShell.Run "node """ & strDir & "\node_modules\electron\cli.js"" .", 0, False
End If
