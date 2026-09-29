' =========================================================================
' LIQUID GLASS STICKY NOTES - 100% SILENT LAUNCHER
' Launches directly into Windows GUI subsystem with zero console/cmd window
' =========================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strDir

WshShell.Run "cmd /c npm start", 0, False
