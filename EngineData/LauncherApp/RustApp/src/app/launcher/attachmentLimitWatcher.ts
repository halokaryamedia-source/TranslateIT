const MAX_ATTACHMENT_FILES = 4;
const NOTICE_DELAY_MS = 650;
let bound = false;
let changeHandler: ((event: Event) => void) | null = null;
let dropHandler: ((event: DragEvent) => void) | null = null;

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

export function bindAttachmentLimitWatcher(): () => void {
  if (bound) return unbindAttachmentLimitWatcher;
  bound = true;
  changeHandler = (event: Event) => {
    const input = event.target as HTMLInputElement | null;
    if (input?.id === "attachmentInput") warnIfTooManyFiles(input.files);
  };
  dropHandler = (event: DragEvent) => {
    warnIfTooManyFiles(event.dataTransfer?.files);
  };
  document.addEventListener("change", changeHandler);
  document.addEventListener("drop", dropHandler, true);
  return unbindAttachmentLimitWatcher;
}

export function unbindAttachmentLimitWatcher(): void {
  if (!bound) return;
  if (changeHandler) document.removeEventListener("change", changeHandler);
  if (dropHandler) document.removeEventListener("drop", dropHandler, true);
  changeHandler = null;
  dropHandler = null;
  bound = false;
}
