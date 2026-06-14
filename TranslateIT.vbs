Option Explicit

Dim fso, shell, projectRoot, rustAppDir, logDir, logFile, releaseExe, packageFile
Dim commandLine, appProcessName, mode, devRequested

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
rustAppDir = projectRoot & "\EngineData\LauncherApp\RustApp"
logDir = projectRoot & "\UserData\LogData"
releaseExe = rustAppDir & "\src-tauri\target\release\translateit_rustapp.exe"
packageFile = rustAppDir & "\package.json"
appProcessName = "translateit_rustapp.exe"
devRequested = False

If WScript.Arguments.Count > 0 Then
    mode = LCase(Trim(WScript.Arguments.Item(0)))
    If mode = "dev" Or mode = "/dev" Or mode = "--dev" Then devRequested = True
End If

EnsureFolder projectRoot & "\UserData"
EnsureFolder logDir

logFile = logDir & "\launcher_latest.log"
AppendLog logFile, "INFO", "launcher_start", "release_first=true; dev_requested=" & CStr(devRequested)

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

If IsProcessRunning(appProcessName) Then
    AppendLog logFile, "INFO", "app_already_running", appProcessName
    shell.AppActivate "TranslateIT"
    WScript.Quit 0
End If

shell.CurrentDirectory = rustAppDir

If fso.FileExists(releaseExe) Then
    commandLine = Chr(34) & releaseExe & Chr(34)
    AppendLog logFile, "INFO", "launch_release_exe", commandLine
    shell.Run commandLine, 1, False
    WScript.Quit 0
End If

If devRequested Then
    If Not CommandExists("npm.cmd") Then
        AppendLog logFile, "ERROR", "dev_requested_but_npm_missing", rustAppDir
        MsgBox "TranslateIT development mode was requested, but npm was not found." & vbCrLf & vbCrLf & _
            "Install Node.js or build the release app first.", vbCritical, "TranslateIT"
        WScript.Quit 1
    End If

    commandLine = "npm.cmd run dev"
    AppendLog logFile, "WARN", "launch_dev_mode_explicit", commandLine
    shell.Run commandLine, 1, False
    WScript.Quit 0
End If

AppendLog logFile, "ERROR", "release_exe_missing", releaseExe
MsgBox "TranslateIT release app is not built yet." & vbCrLf & vbCrLf & _
    "For normal use, build/package the Rust/Tauri app first." & vbCrLf & vbCrLf & _
    "Expected app:" & vbCrLf & releaseExe & vbCrLf & vbCrLf & _
    "Developer mode is available only with:" & vbCrLf & _
    "wscript TranslateIT.vbs --dev", vbExclamation, "TranslateIT"
WScript.Quit 1

Sub EnsureFolder(folderPath)
    If Not fso.FolderExists(folderPath) Then fso.CreateFolder(folderPath)
End Sub

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

Function IsProcessRunning(processName)
    Dim service, processes
    On Error Resume Next
    Set service = GetObject("winmgmts:\\.\root\cimv2")
    Set processes = service.ExecQuery("SELECT Name FROM Win32_Process WHERE Name='" & processName & "'")
    If Err.Number <> 0 Then
        IsProcessRunning = False
        Err.Clear
    Else
        IsProcessRunning = (processes.Count > 0)
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
