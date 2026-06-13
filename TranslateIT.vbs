Option Explicit

Dim fso, shell, projectRoot, rustAppDir, logDir, logFile, commandLine

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

projectRoot = fso.GetParentFolderName(WScript.ScriptFullName)
rustAppDir = projectRoot & "\EngineData\LauncherApp\RustApp"
logDir = projectRoot & "\UserData\LogData"

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
commandLine = "npm.cmd run dev"
AppendLog logFile, "INFO", "launch_command", commandLine
shell.Run commandLine, 1, False

Sub AppendLog(fileName, level, message, details)
    Dim fileHandle, line
    Set fileHandle = fso.OpenTextFile(fileName, 8, True, 0)
    line = "[" & Now & "] " & level & ": " & message
    If Len(details) > 0 Then line = line & " | " & details
    fileHandle.WriteLine line
    fileHandle.Close
End Sub
