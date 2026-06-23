using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

public class DesignItLauncher : Form
{
    private TextBox logBox;
    private Button openLogsButton;
    private Label statusLabel;
    private string appRoot;
    private string scriptDir;
    private string startScript;
    private string stopScript;
    private string logDir;
    private bool startedOnce = false;
    private bool isClosing = false;

    [STAThread]
    public static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new DesignItLauncher());
    }

    public DesignItLauncher()
    {
        appRoot = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        scriptDir = ResolveScriptsDir(appRoot);
        startScript = Path.Combine(scriptDir, "designit-start.ps1");
        stopScript = Path.Combine(scriptDir, "designit-stop.ps1");
        logDir = Path.GetFullPath(Path.Combine(appRoot, "DevelopingData", "FigmaDesignExport", "_runtime", "designit-local-engine", "logs"));

        Text = "DesignIT";
        Width = 720;
        Height = 520;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(640, 440);

        FormClosing += OnLauncherClosing;

        var root = new TableLayoutPanel();
        root.Dock = DockStyle.Fill;
        root.RowCount = 4;
        root.ColumnCount = 1;
        root.Padding = new Padding(16);
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 46));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, 42));
        Controls.Add(root);

        var title = new Label();
        title.Text = "DesignIT Local Engine";
        title.Font = new Font(FontFamily.GenericSansSerif, 16, FontStyle.Bold);
        title.Dock = DockStyle.Fill;
        title.TextAlign = ContentAlignment.MiddleLeft;
        root.Controls.Add(title, 0, 0);

        var buttonRow = new FlowLayoutPanel();
        buttonRow.Dock = DockStyle.Fill;
        buttonRow.FlowDirection = FlowDirection.LeftToRight;
        root.Controls.Add(buttonRow, 0, 1);

        openLogsButton = new Button();
        openLogsButton.Text = "Open Logs";
        openLogsButton.Width = 120;
        openLogsButton.Height = 30;
        openLogsButton.Click += (s, e) => OpenLogs();
        buttonRow.Controls.Add(openLogsButton);

        var closeNote = new Label();
        closeNote.Text = "Close this window to stop DesignIT local engine.";
        closeNote.AutoSize = true;
        closeNote.TextAlign = ContentAlignment.MiddleLeft;
        closeNote.Padding = new Padding(8, 7, 0, 0);
        buttonRow.Controls.Add(closeNote);

        logBox = new TextBox();
        logBox.Dock = DockStyle.Fill;
        logBox.Multiline = true;
        logBox.ScrollBars = ScrollBars.Vertical;
        logBox.ReadOnly = true;
        logBox.Font = new Font(FontFamily.GenericMonospace, 9);
        root.Controls.Add(logBox, 0, 2);

        statusLabel = new Label();
        statusLabel.Dock = DockStyle.Fill;
        statusLabel.TextAlign = ContentAlignment.MiddleLeft;
        statusLabel.Text = "Starting automatically...";
        root.Controls.Add(statusLabel, 0, 3);

        Shown += async (s, e) => await StartEngine();
    }

    private string ResolveScriptsDir(string root)
    {
        string candidate = Path.Combine(root, "DevelopingData", "FigmaDesignExport", "TranslateIT", "scripts");
        if (Directory.Exists(candidate)) return candidate;

        candidate = root;
        if (File.Exists(Path.Combine(candidate, "designit-start.ps1"))) return candidate;

        throw new DirectoryNotFoundException("DesignIT scripts folder not found from launcher root: " + root);
    }

    private void Log(string text)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string>(Log), text);
            return;
        }
        logBox.AppendText(text + Environment.NewLine);
    }

    private void SetStatus(string text)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string>(SetStatus), text);
            return;
        }
        statusLabel.Text = text;
    }

    private async Task StartEngine()
    {
        if (startedOnce) return;
        startedOnce = true;

        if (!File.Exists(startScript))
        {
            MessageBox.Show("Missing launcher script:\n" + startScript, "DesignIT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        SetStatus("Starting DesignIT local engine...");
        Log("==> Starting DesignIT local engine");
        Log("Root:   " + appRoot);
        Log("Script: " + startScript);
        Log("Logs:   " + logDir);

        int code = await RunPowerShell("-NoProfile -ExecutionPolicy Bypass -File \"" + startScript + "\" -NoMessageBox");
        if (code == 0)
        {
            SetStatus("Ready. Keep this window open while using Figma. Closing this window stops the engine.");
            Log("==> READY. Open the Figma plugin and import by website URL.");
        }
        else
        {
            SetStatus("Start failed. Open logs or check messages above.");
            Log("==> FAILED with exit code " + code);
        }
    }

    private void OnLauncherClosing(object sender, FormClosingEventArgs e)
    {
        if (isClosing) return;
        isClosing = true;
        try
        {
            SetStatus("Stopping DesignIT local engine...");
            Log("==> Closing launcher. Stopping local engine services...");
            int code = RunPowerShellSync("-NoProfile -ExecutionPolicy Bypass -File \"" + stopScript + "\"");
            Log("==> Stop command finished with exit code " + code);
        }
        catch (Exception ex)
        {
            Log("ERROR: stop failed: " + ex.Message);
        }
    }

    private Task<int> RunPowerShell(string arguments)
    {
        return Task.Run(() => RunPowerShellSync(arguments));
    }

    private int RunPowerShellSync(string arguments)
    {
        var psi = new ProcessStartInfo();
        psi.FileName = "powershell.exe";
        psi.Arguments = arguments;
        psi.WorkingDirectory = scriptDir;
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = true;
        psi.StandardOutputEncoding = Encoding.UTF8;
        psi.StandardErrorEncoding = Encoding.UTF8;

        using (var process = new Process())
        {
            process.StartInfo = psi;
            process.OutputDataReceived += (s, e) => { if (e.Data != null) Log(e.Data); };
            process.ErrorDataReceived += (s, e) => { if (e.Data != null) Log("ERROR: " + e.Data); };
            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();
            return process.ExitCode;
        }
    }

    private void OpenLogs()
    {
        try
        {
            Directory.CreateDirectory(logDir);
            Process.Start("explorer.exe", "\"" + logDir + "\"");
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "DesignIT", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
