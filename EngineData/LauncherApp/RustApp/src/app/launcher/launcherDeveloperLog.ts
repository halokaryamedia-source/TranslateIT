type WorkerManifestLike = {
  asr_model_ready?: boolean;
  asr_backup_model_ready?: boolean;
  realtime_translation_model_ready?: boolean;
  quality_translation_model_ready?: boolean;
  piper_ready?: boolean;
  sapi_ready?: boolean;
  voice_actor_marcel_ready?: boolean;
  ctranslate2_cuda_available?: boolean;
  torch_cuda_available?: boolean;
} | null | undefined;

type CommandErrorLike = {
  command: string;
  message: string;
};

const MAX_RENDERED_COMMAND_ERRORS = 6;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildDeveloperLogRows(args: {
  runtimeLoaded: boolean;
  worker: WorkerManifestLike;
  cpu: string;
  ram: string;
  gpu: string;
  gpuStatus: string;
  nextAction: string;
  commandErrors: CommandErrorLike[];
}): string {
  const worker = args.worker;
  const hiddenErrors = Math.max(0, args.commandErrors.length - MAX_RENDERED_COMMAND_ERRORS);
  const commandErrors = args.commandErrors.slice(0, MAX_RENDERED_COMMAND_ERRORS).map((error) => {
    const command = escapeHtml(error.command);
    const message = escapeHtml(error.message);
    return `<p><strong>[ERR]</strong>${command}: ${message}</p>`;
  });
  if (hiddenErrors > 0) commandErrors.push(`<p><strong>[ERR]</strong>${hiddenErrors} older command error(s) hidden.</p>`);

  return [
    `<p><strong>[OK]</strong>${args.runtimeLoaded ? "Runtime status loaded." : "Waiting for diagnostic check."}</p>`,
    `<p><strong>[HW]</strong>CPU ${escapeHtml(args.cpu)} | RAM ${escapeHtml(args.ram)} | GPU ${escapeHtml(args.gpu)}</p>`,
    `<p><strong>[GPU]</strong>${escapeHtml(args.gpuStatus)}</p>`,
    `<p><strong>[ASR]</strong>Primary ${worker?.asr_model_ready ? "ready" : "missing"} | Backup ${worker?.asr_backup_model_ready ? "ready" : "missing"}</p>`,
    `<p><strong>[TR]</strong>Marian ${worker?.realtime_translation_model_ready ? "ready" : "missing"} | NLLB ${worker?.quality_translation_model_ready ? "ready" : "missing"}</p>`,
    `<p><strong>[TTS]</strong>${worker?.piper_ready ? "Piper ready" : worker?.sapi_ready ? "Windows SAPI fallback ready" : "No provider"} | Marcel ${worker?.voice_actor_marcel_ready ? "ready" : "missing"}</p>`,
    `<p><strong>[CUDA]</strong>CTranslate2 ${worker?.ctranslate2_cuda_available ? "ready" : "not ready"} | Torch ${worker?.torch_cuda_available ? "ready" : "CPU-only"}</p>`,
    `<p><strong>[WAIT]</strong>${escapeHtml(args.nextAction)}</p>`,
    ...commandErrors,
  ].join("");
}
