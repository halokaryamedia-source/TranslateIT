const MAX_ATTACHMENT_FILES = 4;
const NOTICE_DELAY_MS = 650;
let bound = false;

function setNotice(message: string): void {
  const notice = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (notice) notice.textContent = message;
}

function warnIfTooManyFiles(files: FileList | null | undefined): void {
  const count = files?.length ?? 0;
  if (count > MAX_ATTACHMENT_FILES) {
    window.setTimeout(() => {
      setNotice(`Only the first ${MAX_ATTACHMENT_FILES} attachment files were used. Selected: ${count}.`);
    }, NOTICE_DELAY_MS);
  }
}

export function bindAttachmentLimitWatcher(): void {
  if (bound) return;
  bound = true;
  document.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement | null;
    if (input?.id === "attachmentInput") warnIfTooManyFiles(input.files);
  });
  document.addEventListener("drop", (event) => {
    warnIfTooManyFiles(event.dataTransfer?.files);
  }, true);
}

bindAttachmentLimitWatcher();
