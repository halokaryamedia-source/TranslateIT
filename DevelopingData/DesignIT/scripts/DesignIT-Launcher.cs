using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

public class RoundedPanel : Panel
{
    public int Radius = 18;
    public Color FillColor = Color.FromArgb(13, 19, 32);
    public Color StrokeColor = Color.FromArgb(30, 41, 59);

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;

        using (GraphicsPath path = new GraphicsPath())
        {
            int d = Radius * 2;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            path.AddArc(rect.X, rect.Y, d, d, 180, 90);
            path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
            path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
            path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
            path.CloseFigure();

            using (SolidBrush brush = new SolidBrush(FillColor))
                e.Graphics.FillPath(brush, path);

            using (Pen pen = new Pen(StrokeColor, 1))
                e.Graphics.DrawPath(pen, path);
        }
    }
}

public class DesignItLauncher : Form
{
    private readonly Color Bg = Color.FromArgb(7, 10, 18);
    private readonly Color Card = Color.FromArgb(13, 19, 32);
    private readonly Color CardDeep = Color.FromArgb(4, 8, 16);
    private readonly Color ButtonDark = Color.FromArgb(18, 28, 46);
    private readonly Color ButtonDarkHover = Color.FromArgb(24, 36, 58);
    private readonly Color Border = Color.FromArgb(30, 41, 59);
    private readonly Color TextMain = Color.FromArgb(248, 250, 252);
    private readonly Color TextMuted = Color.FromArgb(148, 163, 184);
    private readonly Color Green = Color.FromArgb(34, 197, 94);
    private readonly Color Yellow = Color.FromArgb(250, 204, 21);
    private readonly Color Red = Color.FromArgb(239, 68, 68);

    private Label badge;
    private Label statusDot;
    private Label statusTitle;
    private Label statusDetail;
    private Label statusMeta;
    private Label percentLabel;
    private Panel progressTrack;
    private Panel progressFill;
    private Label footer;
    private TextBox logBox;
    private RoundedPanel detailsPanel;

    private Button actionButton;
    private Button detailsButton;

    private string appRoot;
    private string scriptDir;
    private string startScript;
    private string stopScript;
    private string logDir;

    private bool hasStarted = false;
    private bool isBusy = false;
    private bool detailsOpen = false;
    private bool isClosing = false;
    private bool healthCheckRunning = false;

    private DateTime engineStartTime;
    private System.Windows.Forms.Timer healthTimer;

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
        scriptDir = Path.Combine(appRoot, "scripts");
        startScript = Path.Combine(scriptDir, "designit-start.ps1");
        stopScript = Path.Combine(scriptDir, "designit-stop.ps1");
        logDir = Path.Combine(appRoot, "RuntimeData", "logs");

        Text = "DesignIT";
        Width = 720;
        Height = 390;
        MinimumSize = new Size(720, 390);
        MaximumSize = new Size(720, 620);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Bg;
        ForeColor = TextMain;
        FormBorderStyle = FormBorderStyle.FixedSingle;
        MaximizeBox = false;
        FormClosing += OnLauncherClosing;

        healthTimer = new System.Windows.Forms.Timer();
        healthTimer.Interval = 1000;
        healthTimer.Tick += async (s, e) => await PollHealth();

        BuildUi();
        SetStoppedState();
        Shown += async (s, e) => await StartEngine();
    }

    private Font F(float size, FontStyle style)
    {
        return new Font("Segoe UI", size, style);
    }

    private Label LabelText(string text, float size, FontStyle style, Color color)
    {
        Label l = new Label();
        l.Text = text;
        l.Font = F(size, style);
        l.ForeColor = color;
        l.BackColor = Color.Transparent;
        l.AutoSize = false;
        l.TextAlign = ContentAlignment.MiddleLeft;
        return l;
    }

    private Button ButtonText(string text, Color color, int width)
    {
        Button b = new Button();
        b.Text = text;
        b.Width = width;
        b.Height = 42;
        b.Font = F(9.3f, FontStyle.Bold);
        b.ForeColor = Color.White;
        b.BackColor = color;
        b.FlatStyle = FlatStyle.Flat;
        b.FlatAppearance.BorderSize = 0;
        b.Cursor = Cursors.Hand;
        return b;
    }

    private Label BadgeText(string text, Color color, int width)
    {
        Label c = new Label();
        c.Text = text;
        c.Font = F(8.5f, FontStyle.Bold);
        c.ForeColor = color;
        c.BackColor = Color.FromArgb(8, 13, 23);
        c.TextAlign = ContentAlignment.MiddleCenter;
        c.AutoSize = false;
        c.Width = width;
        c.Height = 28;
        return c;
    }

    private RoundedPanel CardPanel(int x, int y, int w, int h, Color fill)
    {
        RoundedPanel p = new RoundedPanel();
        p.FillColor = fill;
        p.StrokeColor = Border;
        p.Radius = 20;
        p.SetBounds(x, y, w, h);
        return p;
    }

    private void BuildUi()
    {
        Panel root = new Panel();
        root.Dock = DockStyle.Fill;
        root.BackColor = Bg;
        Controls.Add(root);

        Label logo = new Label();
        logo.Text = "D";
        logo.Font = F(19, FontStyle.Bold);
        logo.ForeColor = Color.White;
        logo.BackColor = Green;
        logo.TextAlign = ContentAlignment.MiddleCenter;
        logo.SetBounds(28, 24, 50, 50);
        root.Controls.Add(logo);

        Label title = LabelText("DesignIT", 20, FontStyle.Bold, TextMain);
        title.SetBounds(94, 22, 260, 30);
        root.Controls.Add(title);

        Label subtitle = LabelText("Local website-to-Figma engine", 9.6f, FontStyle.Regular, TextMuted);
        subtitle.SetBounds(96, 53, 390, 22);
        root.Controls.Add(subtitle);

        badge = BadgeText("STOPPED", TextMuted, 104);
        badge.SetBounds(574, 34, 104, 28);
        root.Controls.Add(badge);

        RoundedPanel statusCard = CardPanel(28, 96, 650, 158, Card);
        root.Controls.Add(statusCard);

        statusDot = LabelText("●", 13, FontStyle.Bold, Yellow);
        statusDot.SetBounds(26, 22, 22, 26);
        statusCard.Controls.Add(statusDot);

        statusTitle = LabelText("DesignIT is stopped", 16.5f, FontStyle.Bold, TextMain);
        statusTitle.SetBounds(50, 22, 420, 30);
        statusCard.Controls.Add(statusTitle);

        percentLabel = LabelText("0%", 10, FontStyle.Bold, TextMuted);
        percentLabel.TextAlign = ContentAlignment.MiddleRight;
        percentLabel.SetBounds(522, 25, 86, 24);
        statusCard.Controls.Add(percentLabel);

        statusDetail = LabelText("Click Start to run the local engine.", 9.5f, FontStyle.Regular, TextMuted);
        statusDetail.SetBounds(50, 54, 560, 22);
        statusCard.Controls.Add(statusDetail);

        statusMeta = LabelText("Local services are not running.", 8.7f, FontStyle.Regular, TextMuted);
        statusMeta.SetBounds(50, 78, 550, 20);
        statusCard.Controls.Add(statusMeta);

        progressTrack = new Panel();
        progressTrack.BackColor = Color.FromArgb(8, 13, 23);
        progressTrack.SetBounds(50, 112, 560, 7);
        statusCard.Controls.Add(progressTrack);

        progressFill = new Panel();
        progressFill.BackColor = TextMuted;
        progressFill.SetBounds(0, 0, 16, 7);
        progressTrack.Controls.Add(progressFill);

        Label hint = LabelText("Status updates automatically. Open Details only when troubleshooting.", 8.6f, FontStyle.Regular, TextMuted);
        hint.SetBounds(50, 128, 560, 20);
        statusCard.Controls.Add(hint);

        actionButton = ButtonText("Start", Green, 230);
        actionButton.SetBounds(28, 278, 230, 42);
        actionButton.Click += async (s, e) => await ToggleEngine();
        root.Controls.Add(actionButton);

        detailsButton = ButtonText("Details", ButtonDark, 150);
        detailsButton.SetBounds(528, 278, 150, 42);
        detailsButton.Click += (s, e) => ToggleDetails();
        root.Controls.Add(detailsButton);

        footer = LabelText("Keep this window open while using the Figma plugin.", 8.6f, FontStyle.Regular, TextMuted);
        footer.SetBounds(30, 338, 620, 20);
        root.Controls.Add(footer);

        detailsPanel = CardPanel(28, 370, 650, 200, CardDeep);
        detailsPanel.Visible = false;
        root.Controls.Add(detailsPanel);

        logBox = new TextBox();
        logBox.Multiline = true;
        logBox.ScrollBars = ScrollBars.Vertical;
        logBox.ReadOnly = true;
        logBox.BorderStyle = BorderStyle.None;
        logBox.BackColor = CardDeep;
        logBox.ForeColor = Color.FromArgb(203, 213, 225);
        logBox.Font = new Font("Consolas", 8.4f);
        logBox.SetBounds(16, 16, 618, 168);
        detailsPanel.Controls.Add(logBox);
    }

    private void ToggleDetails()
    {
        detailsOpen = !detailsOpen;
        detailsPanel.Visible = detailsOpen;
        detailsButton.Text = detailsOpen ? "Hide Details" : "Details";
        Height = detailsOpen ? 620 : 390;
    }

    private void SetProgressPercent(int percent, Color color)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<int, Color>(SetProgressPercent), percent, color);
            return;
        }

        percent = Math.Max(0, Math.Min(100, percent));
        int width = Math.Max(16, (int)Math.Round(560 * (percent / 100.0)));

        progressFill.Width = width;
        progressFill.BackColor = color;
        percentLabel.Text = percent.ToString() + "%";
        percentLabel.ForeColor = color;
    }

    private void SetActionState(bool running, bool busy)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<bool, bool>(SetActionState), running, busy);
            return;
        }

        hasStarted = running;
        isBusy = busy;

        actionButton.Enabled = true;
        actionButton.ForeColor = Color.White;

        if (busy)
        {
            actionButton.Text = running ? "Stopping..." : "Starting...";
            actionButton.BackColor = ButtonDarkHover;
            return;
        }

        if (running)
        {
            actionButton.Text = "Stop";
            actionButton.BackColor = Red;
        }
        else
        {
            actionButton.Text = "Start";
            actionButton.BackColor = Green;
        }
    }

    private string ElapsedText()
    {
        TimeSpan t = DateTime.Now - engineStartTime;
        return string.Format("{0:00}:{1:00}", Math.Floor(t.TotalMinutes), t.Seconds);
    }

    private void Log(string text)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string>(Log), text);
            return;
        }

        logBox.AppendText("[" + DateTime.Now.ToString("HH:mm:ss") + "] " + text + Environment.NewLine);
    }

    private void SetStatus(string title, string detail, string meta, Color color, string badgeText, int percent)
    {
        if (InvokeRequired)
        {
            BeginInvoke(new Action<string, string, string, Color, string, int>(SetStatus), title, detail, meta, color, badgeText, percent);
            return;
        }

        statusTitle.Text = title;
        statusTitle.ForeColor = color;
        statusDetail.Text = detail;
        statusMeta.Text = meta;
        statusDot.ForeColor = color;
        badge.Text = badgeText;
        badge.ForeColor = color;
        SetProgressPercent(percent, color);
    }

    private void SetStoppedState()
    {
        healthTimer.Stop();
        SetActionState(false, false);
        SetStatus("DesignIT is stopped", "Click Start to run the local engine.", "Local services are not running.", TextMuted, "STOPPED", 0);
        footer.Text = "Stopped. Click Start to run DesignIT again.";
    }

    private bool EndpointOk(string url)
    {
        try
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Timeout = 1200;
            req.ReadWriteTimeout = 1200;
            using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
            using (StreamReader sr = new StreamReader(res.GetResponseStream()))
            {
                string body = sr.ReadToEnd().ToLowerInvariant();
                return ((int)res.StatusCode >= 200 && (int)res.StatusCode < 300 && body.Contains("\"ok\":true"));
            }
        }
        catch
        {
            return false;
        }
    }

    private async Task PollHealth()
    {
        if (healthCheckRunning) return;
        healthCheckRunning = true;

        bool renderBridge = false;
        bool visual = false;

        await Task.Run(() =>
        {
            renderBridge = EndpointOk("http://127.0.0.1:8844/health");
            visual = EndpointOk("http://127.0.0.1:7860/health");
        });

        TimeSpan elapsed = DateTime.Now - engineStartTime;
        int seconds = (int)elapsed.TotalSeconds;

        if (renderBridge && visual)
        {
            SetStatus("DesignIT is ready", "Open Figma plugin and import by website URL.", "Ready for website import.", Green, "READY", 100);
            footer.Text = "Ready. Keep this window open while importing.";
            SetActionState(true, false);
            healthTimer.Stop();
            healthCheckRunning = false;
            return;
        }

        if (!renderBridge)
        {
            int p = Math.Min(45, 10 + seconds * 2);
            SetStatus("Starting RenderBridge", "Preparing local import server.", "Elapsed " + ElapsedText() + " • not frozen", Yellow, "STARTING", p);
            SetActionState(true, false);
            healthCheckRunning = false;
            return;
        }

        if (renderBridge && !visual)
        {
            int p = Math.Min(92, 45 + seconds / 2);

            if (seconds < 10)
            {
                SetStatus("Starting visual engine", "Preparing screenshot parser.", "Elapsed " + ElapsedText() + " • checking visual engine", Yellow, "STARTING", p);
            }
            else if (seconds < 180)
            {
                SetStatus("Visual engine warming up", "Not frozen. Loading visual models in background.", "Elapsed " + ElapsedText() + " • estimated progress " + p + "%", Yellow, "LOADING", p);
            }
            else
            {
                SetStatus("Taking longer than expected", "Open Details to inspect OmniParser logs.", "Elapsed " + ElapsedText() + " • visual engine still not reachable", Yellow, "CHECK LOG", p);
            }

            SetActionState(true, false);
        }

        healthCheckRunning = false;
    }

    private void UpdateFromLog(string line)
    {
        string lower = (line ?? "").ToLowerInvariant();
        int seconds = (int)(DateTime.Now - engineStartTime).TotalSeconds;

        if (lower.Contains("checking external visual engine"))
        {
            SetStatus("Checking visual engine", "Preparing screenshot parser.", "Elapsed " + ElapsedText() + " • visual check started", Yellow, "CHECKING", Math.Min(35, 15 + seconds));
        }
        else if (lower.Contains("waiting for omniparser"))
        {
            SetStatus("Visual engine warming up", "Not frozen. Loading visual models in background.", "Elapsed " + ElapsedText() + " • waiting for health", Yellow, "LOADING", Math.Min(85, 35 + seconds));
        }
        else if (lower.Contains("renderbridge") && lower.Contains("ready"))
        {
            SetStatus("RenderBridge is ready", "Waiting for visual engine.", "Elapsed " + ElapsedText() + " • visual engine still loading", Yellow, "LOADING", Math.Min(80, 45 + seconds));
        }
        else if (lower.Contains("designit local engine status"))
        {
            SetStatus("Checking final health", "Verifying RenderBridge and visual engine.", "Elapsed " + ElapsedText() + " • final check", Yellow, "VERIFY", Math.Min(90, 55 + seconds));
        }
    }

    private async Task ToggleEngine()
    {
        if (isBusy) return;

        if (hasStarted)
            await StopEngine();
        else
            await StartEngine(true);
    }

    private async Task StartEngine(bool force = false)
    {
        if (hasStarted && !force) return;

        if (!File.Exists(startScript))
        {
            MessageBox.Show("Missing launcher script:\n" + startScript, "DesignIT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        engineStartTime = DateTime.Now;
        SetActionState(false, true);
        logBox.Clear();

        SetStatus("Preparing DesignIT", "Starting local services.", "Elapsed 00:00 • initializing", Yellow, "STARTING", 8);
        footer.Text = "Keep this window open while using the Figma plugin.";

        Log("DesignIT root: " + appRoot);
        Log("Start script: " + startScript);
        Log("Logs: " + logDir);

        int code = await RunPowerShell("-NoProfile -ExecutionPolicy Bypass -File \"" + startScript + "\" -NoMessageBox");

        if (code == 0)
        {
            SetActionState(true, false);
            healthTimer.Start();
            await PollHealth();
        }
        else
        {
            SetStatus("Start failed", "Open Details to review logs.", "Engine did not start correctly.", Red, "FAILED", 100);
            footer.Text = "Start failed. Open Details for logs.";
            Log("FAILED with exit code " + code);
            SetActionState(false, false);
        }
    }

    private async Task StopEngine()
    {
        if (!File.Exists(stopScript))
        {
            MessageBox.Show("Missing stop script:\n" + stopScript, "DesignIT", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        healthTimer.Stop();
        SetActionState(true, true);
        SetStatus("Stopping DesignIT", "Closing local services.", "Stopping background services.", Yellow, "STOPPING", 60);
        Log("Stopping local engine services...");

        int code = await RunPowerShell("-NoProfile -ExecutionPolicy Bypass -File \"" + stopScript + "\"");

        Log("Stop finished with exit code " + code);
        SetStoppedState();
    }

    private void OnLauncherClosing(object sender, FormClosingEventArgs e)
    {
        if (isClosing) return;
        isClosing = true;

        try
        {
            healthTimer.Stop();
            SetStatus("Stopping DesignIT", "Closing local services.", "Stopping background services.", Yellow, "STOPPING", 60);
            Log("Stopping local engine services...");
            int code = RunPowerShellSync("-NoProfile -ExecutionPolicy Bypass -File \"" + stopScript + "\"");
            Log("Stop finished with exit code " + code);
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
        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = "powershell.exe";
        psi.Arguments = arguments;
        psi.WorkingDirectory = scriptDir;
        psi.UseShellExecute = false;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.CreateNoWindow = true;
        psi.StandardOutputEncoding = Encoding.UTF8;
        psi.StandardErrorEncoding = Encoding.UTF8;

        using (Process process = new Process())
        {
            process.StartInfo = psi;

            process.OutputDataReceived += (s, e) =>
            {
                if (e.Data != null)
                {
                    Log(e.Data);
                    UpdateFromLog(e.Data);
                }
            };

            process.ErrorDataReceived += (s, e) =>
            {
                if (e.Data != null)
                {
                    Log("ERROR: " + e.Data);
                    UpdateFromLog(e.Data);
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();
            process.WaitForExit();
            return process.ExitCode;
        }
    }
}
