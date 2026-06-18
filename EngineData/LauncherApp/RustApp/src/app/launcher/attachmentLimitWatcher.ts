const MAX_ATTACHMENT_FILES = 4;
const NOTICE_DELAY_MS = 650;
let bound = false;
let changeHandler: ((event: Event) => void) | null = null;
let dropHandler: ((event: DragEvent) => void) | null = null;
let noticeTimer: number | null = null;

function setNotice(message: string): void {
  const notice = document.querySelector<HTMLParagraphElement>("#assistantMessage");
  if (notice) notice.textContent = message;
}

function warnIfTooManyFiles(files: FileList | null | undefined): void {
  const count = files?.length ?? 0;
  if (count > MAX_ATTACHMENT_FILES) {
    if (noticeTimer !== null) window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => {
      setNotice(`Only the first ${MAX_ATTACHMENT_FILES} attachment files were used. Selected: ${count}.`);
      noticeTimer = null;
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
  if (noticeTimer !== null) window.clearTimeout(noticeTimer);
  changeHandler = null;
  dropHandler = null;
  noticeTimer = null;
  bound = false;
}
