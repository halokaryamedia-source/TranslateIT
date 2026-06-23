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
    private Button startButton;
    private Button stopButton;
    private Button openLogsButton;
    private Label statusLabel;
    private string scriptDir;
    private string startScript;
    private string stopScript;
    private string logDir;

    [STAThread]
    public static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new DesignItLauncher());
    }

    public DesignItLauncher()
    {
        scriptDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
        startScript = Path.Combine(scriptDir, "designit-start.ps1");
        stopScript = Path.Combine(scriptDir, "designit-stop.ps1");
        logDir = Path.GetFullPath(Path.Combine(scriptDir, "..", "..", "_runtime", "designit-local-engine", "logs"));

        Text = "DesignIT Local Engine";
        Width = 720;
        Height = 520;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(640, 440);

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

        startButton = new Button();
        startButton.Text = "Start Engine";
        startButton.Width = 140;
        startButton.Height = 30;
        startButton.Click += async (s, e) => await StartEngine();
        buttonRow.Controls.Add(startButton);

        stopButton = new Button();
        stopButton.Text = "Stop Engine";
        stopButton.Width = 140;
        stopButton.Height = 30;
        stopButton.Click += async (s, e) => await StopEngine();
        buttonRow.Controls.Add(stopButton);

        openLogsButton = new Button();
        openLogsButton.Text = "Open Logs";
        openLogsButton.Width = 120;
        openLogsButton.Height = 30;
        openLogsButton.Click += (s, e) => OpenLogs();
        buttonRow.Controls.Add(openLogsButton);

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
        statusLabel.Text = "Ready. Click Start Engine, then use the Figma plugin.";
        root.Controls.Add(statusLabel, 0, 3);

        Shown += async (s, e) => await StartEngine();
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
        if (!File.Exists(startScript))
        {
            MessageBox.Show("Missing launcher script:\n" + startScript, "DesignIT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        startButton.Enabled = false;
        SetStatus("Starting DesignIT local engine...");
        Log("==> Starting DesignIT local engine");
        Log("Script: " + startScript);

        int code = await RunPowerShell("-NoProfile -ExecutionPolicy Bypass -File \"" + startScript + "\" -NoMessageBox");
        if (code == 0)
        {
            SetStatus("Ready. Open Figma plugin and import by website URL.");
            Log("==> READY. You can now use the Figma plugin.");
        }
        else
        {
            SetStatus("Start failed. Open logs or check messages above.");
            Log("==> FAILED with exit code " + code);
        }
        startButton.Enabled = true;
    }

    private async Task StopEngine()
    {
        if (!File.Exists(stopScript))
        {
            MessageBox.Show("Missing stop script:\n" + stopScript, "DesignIT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        stopButton.Enabled = false;
        SetStatus("Stopping DesignIT local engine...");
        Log("==> Stopping DesignIT local engine");
        int code = await RunPowerShell("-NoProfile -ExecutionPolicy Bypass -File \"" + stopScript + "\"");
        SetStatus(code == 0 ? "Stopped." : "Stop command finished with warnings.");
        stopButton.Enabled = true;
    }

    private Task<int> RunPowerShell(string arguments)
    {
        return Task.Run(() =>
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
        });
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
