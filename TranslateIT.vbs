Option Explicit

Dim fso, shell, scriptPath, scriptDir, projectRoot
Dim logDir, logFile, pythonwPath, commandLine, env

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptPath = WScript.ScriptFullName
scriptDir = fso.GetParentFolderName(scriptPath)
projectRoot = scriptDir

logDir = projectRoot & "\UserData\LogData"
If Not fso.FolderExists(projectRoot & "\UserData") Then fso.CreateFolder(projectRoot & "\UserData")
If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

logFile = logDir & "\launcher_latest.log"
pythonwPath = projectRoot & "\DevelopingData\ToolKitData\rt\Scripts\pythonw.exe"

AppendLog logFile, "INFO", "root_vbs_launch_requested", "project_root=" & projectRoot
AppendLog logFile, "INFO", "pythonw_path", pythonwPath

If Not fso.FileExists(pythonwPath) Then
    AppendLog logFile, "ERROR", "pythonw_missing", pythonwPath
    MsgBox "TranslateIT runtime is missing:" & vbCrLf & pythonwPath & vbCrLf & vbCrLf & "Please run runtime setup/repair or use the debug launcher.", vbCritical, "TranslateIT"
    WScript.Quit 1
End If

shell.CurrentDirectory = projectRoot
Set env = shell.Environment("PROCESS")
env("TRANSLATEIT_LAUNCH_MODE") = "gui"
env("TRANSLATEIT_PROJECT_ROOT") = projectRoot

If Len(env("TRANSLATEIT_TTS_BACKEND")) = 0 Then
    env("TRANSLATEIT_TTS_BACKEND") = "sapi_direct_async"
    AppendLog logFile, "INFO", "tts_backend_defaulted", "sapi_direct_async"
Else
    AppendLog logFile, "INFO", "tts_backend_preserved", env("TRANSLATEIT_TTS_BACKEND")
End If

commandLine = """" & pythonwPath & """ -m EngineData.LauncherApp.launcher_bootstrap"
AppendLog logFile, "INFO", "launch_command", commandLine
shell.Run commandLine, 0, False
AppendLog logFile, "INFO", "launch_dispatched", "pythonw_started=true"

Sub AppendLog(fileName, level, message, details)
    Dim fileHandle, line
    Set fileHandle = fso.OpenTextFile(fileName, 8, True, 0)
    line = "[" & Now & "] " & level & ": " & message
    If Len(details) > 0 Then
        line = line & " | " & details
    End If
    fileHandle.WriteLine line
    fileHandle.Close
End Sub
