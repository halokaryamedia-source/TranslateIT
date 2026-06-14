Option Explicit

Dim fso, shell, projectRoot, rustAppDir, logDir, logFile, releaseExe, devCommand, commandLine

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
rustAppDir = projectRoot & "\EngineData\LauncherApp\RustApp"
logDir = projectRoot & "\UserData\LogData"
releaseExe = rustAppDir & "\src-tauri\target\release\translateit_rustapp.exe"
devCommand = "npm.cmd run dev"

If Not fso.FolderExists(projectRoot & "\UserData") Then fso.CreateFolder(projectRoot & "\UserData")
If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

logFile = logDir & "\launcher_latest.log"
AppendLog logFile, "INFO", "rustapp_requested", rustAppDir

If Not fso.FolderExists(rustAppDir) Then
    AppendLog logFile, "ERROR", "rustapp_missing", rustAppDir
    MsgBox "TranslateIT RustApp folder is missing:" & vbCrLf & rustAppDir, vbCritical, "TranslateIT"
    WScript.Quit 1
End If

shell.CurrentDirectory = rustAppDir

If fso.FileExists(releaseExe) Then
    commandLine = Chr(34) & releaseExe & Chr(34)
    AppendLog logFile, "INFO", "launch_release_exe", commandLine
Else
    commandLine = devCommand
    AppendLog logFile, "WARN", "release_exe_missing_using_dev_mode", releaseExe
    AppendLog logFile, "INFO", "launch_dev_command", commandLine
End If

shell.Run commandLine, 1, False

Sub AppendLog(fileName, level, message, details)
    Dim fileHandle, line
    Set fileHandle = fso.OpenTextFile(fileName, 8, True, 0)
    line = "[" & Now & "] " & level & ": " & message
    If Len(details) > 0 Then line = line & " | " & details
    fileHandle.WriteLine line
    fileHandle.Close
End Sub
