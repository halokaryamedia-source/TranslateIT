Option Explicit

Dim fso, shell, projectRoot, rustAppDir, logDir, logFile, releaseExe, packageFile, devCommand, commandLine

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
rustAppDir = projectRoot & "\EngineData\LauncherApp\RustApp"
logDir = projectRoot & "\UserData\LogData"
releaseExe = rustAppDir & "\src-tauri\target\release\translateit_rustapp.exe"
packageFile = rustAppDir & "\package.json"
devCommand = "npm.cmd run dev"

If Not fso.FolderExists(projectRoot & "\UserData") Then fso.CreateFolder(projectRoot & "\UserData")
If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

logFile = logDir & "\launcher_latest.log"
AppendLog logFile, "INFO", "rustapp_requested", rustAppDir

If Not fso.FolderExists(rustAppDir) Then
    AppendLog logFile, "ERROR", "rustapp_missing", rustAppDir
    MsgBox "TranslateIT app folder is missing:" & vbCrLf & rustAppDir, vbCritical, "TranslateIT"
    WScript.Quit 1
End If

If Not fso.FileExists(packageFile) Then
    AppendLog logFile, "ERROR", "package_json_missing", packageFile
    MsgBox "TranslateIT package file is missing:" & vbCrLf & packageFile, vbCritical, "TranslateIT"
    WScript.Quit 1
End If

shell.CurrentDirectory = rustAppDir

If fso.FileExists(releaseExe) Then
    commandLine = Chr(34) & releaseExe & Chr(34)
    AppendLog logFile, "INFO", "launch_release_exe", commandLine
Else
    If Not CommandExists("npm.cmd") Then
        AppendLog logFile, "ERROR", "release_exe_missing_and_npm_missing", releaseExe
        MsgBox "TranslateIT release app is not built yet and npm was not found." & vbCrLf & vbCrLf & _
            "Please build/package the app first or install Node.js for development mode." & vbCrLf & vbCrLf & _
            "Expected release app:" & vbCrLf & releaseExe, vbCritical, "TranslateIT"
        WScript.Quit 1
    End If
    commandLine = devCommand
    AppendLog logFile, "WARN", "release_exe_missing_using_dev_mode", releaseExe
    AppendLog logFile, "INFO", "launch_dev_command", commandLine
End If

shell.Run commandLine, 1, False

Function CommandExists(commandName)
    Dim exitCode
    On Error Resume Next
    exitCode = shell.Run("cmd.exe /c where " & commandName & " >nul 2>nul", 0, True)
    If Err.Number <> 0 Then
        CommandExists = False
        Err.Clear
    Else
        CommandExists = (exitCode = 0)
    End If
    On Error GoTo 0
End Function

Sub AppendLog(fileName, level, message, details)
    Dim fileHandle, line
    Set fileHandle = fso.OpenTextFile(fileName, 8, True, 0)
    line = "[" & Now & "] " & level & ": " & message
    If Len(details) > 0 Then line = line & " | " & details
    fileHandle.WriteLine line
    fileHandle.Close
End Sub
