<script lang="ts">
  import { ArrowLeftRight, Check, Copy } from "@lucide/svelte";
  import { runtimeApi } from "../app/bridge/runtimeApi";
  import { runtimeProductFacade } from "../app/bridge/runtimeProductFacade";
  import { errorMessage, languageName } from "../app/shared/state";
  import type { RuntimeSettings } from "../app/shared/types";

  const MAX_MANUAL_TRANSLATION_CHARS = 2000;
  type TextResultState = "idle" | "translating" | "success" | "stale" | "error";
  type CopyState = "idle" | "copied" | "error";

  let {
    settings,
    textStatus,
    onSettingsChange,
    onNotice,
  }: {
    settings: RuntimeSettings;
    textStatus: string;
    onSettingsChange: (settings: RuntimeSettings) => void | Promise<void>;
    onNotice: (message: string) => void;
  } = $props();

  let sourceText = $state("");
  let targetText = $state("");
  let translating = $state(false);
  let settingsSaving = $state(false);
  let resultState = $state<TextResultState>("idle");
  let resultLabel = $state("Ready");
  let resultMessage = $state("Type or paste text, then select Translate.");
  let lastTranslatedSource = $state<string | null>(null);
  let copyState = $state<CopyState>("idle");
  let targetRevision = 0;

  const sourceLanguageName = $derived(languageName(settings.source_language));
  const targetLanguageName = $derived(languageName(settings.target_language));

  function setResult(state: TextResultState, label: string, message: string): void {
    resultState = state;
    resultLabel = label;
    resultMessage = message;
  }

  function handleSourceInput(): void {
    if (lastTranslatedSource === null) {
      if (resultState === "error") setResult("idle", "Ready", "Select Translate when the source text is ready.");
      return;
    }
    if (sourceText.trim() === lastTranslatedSource) {
      setResult("success", "Translated", "Translation matches the current source text.");
      return;
    }
    setResult("stale", "Needs update", "Source text changed after the last translation. Translate again to update the result.");
  }

  function handleTargetInput(): void {
    targetRevision += 1;
    if (copyState !== "idle") copyState = "idle";
  }

  async function submitText(): Promise<void> {
    const source = sourceText.trim();
    if (!source) {
      setResult("error", "Enter text", "Type or paste source text before translating.");
      onNotice("Type text before translating.");
      return;
    }
    if (Array.from(source).length > MAX_MANUAL_TRANSLATION_CHARS) {
      const message = `Text is too long. Limit: ${MAX_MANUAL_TRANSLATION_CHARS} characters.`;
      setResult("error", "Text too long", message);
      onNotice(message);
      return;
    }
    if (translating) return;

    const requestSource = source;
    const requestTargetRevision = targetRevision;
    const previousTarget = targetText;
    translating = true;
    copyState = "idle";
    setResult("translating", "Translating", "Using the current local translation runtime.");
    onNotice("Translating with local engine...");

    try {
      const result = await runtimeProductFacade.runProductTranslation(requestSource);
      const userEditedTargetWhileRunning = targetRevision !== requestTargetRevision;
      if (!result.ok) {
        if (!userEditedTargetWhileRunning) targetText = previousTarget;
        setResult("error", "Couldn't translate", result.message);
        onNotice(`Translation blocked: ${result.message}`);
        return;
      }

      if (userEditedTargetWhileRunning) {
        setResult(
          "stale",
          "Edit kept",
          "Translation finished after you edited the result. Your newer edit was kept instead of being overwritten.",
        );
        onNotice("Translation finished, but your newer result edit was kept.");
        return;
      }

      targetText = result.translated;
      lastTranslatedSource = requestSource;
      if (sourceText.trim() === requestSource) {
        setResult("success", "Translated", "Translation completed. You can review, edit, or copy the result.");
        onNotice("Translation completed.");
      } else {
        setResult("stale", "Needs update", "The source changed while translating. The visible result is clearly associated with the previous source text.");
        onNotice("Translation completed for the previous source text.");
      }
    } catch (error) {
      if (targetRevision === requestTargetRevision) targetText = previousTarget;
      const message = errorMessage(error);
      setResult("error", "Couldn't translate", message);
      onNotice(`Translation failed: ${message}`);
    } finally {
      translating = false;
    }
  }

  async function copyTranslation(): Promise<void> {
    const value = targetText.trim();
    if (!value) {
      copyState = "error";
      onNotice("There is no translated text to copy.");
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API is unavailable in this frontend context.");
      await navigator.clipboard.writeText(targetText);
      copyState = "copied";
      onNotice("Translation copied to clipboard.");
    } catch (error) {
      copyState = "error";
      onNotice(`Translation could not be copied: ${errorMessage(error)}`);
    }
  }

  async function swapLanguages(): Promise<void> {
    if (settingsSaving || translating) return;
    settingsSaving = true;
    const candidate: RuntimeSettings = {
      ...settings,
      source_language: settings.target_language,
      target_language: settings.source_language,
      audio: { ...settings.audio },
    };
    const visibleTarget = targetText;

    try {
      const result = await runtimeApi.saveSettings(candidate);
      if (!result.ok) throw new Error(result.message || "Language direction could not be saved.");
      const saved = await runtimeApi.loadSettings().catch(() => candidate);
      await onSettingsChange(saved);
      if (visibleTarget.trim()) {
        sourceText = visibleTarget;
        targetText = "";
        targetRevision += 1;
        lastTranslatedSource = null;
        copyState = "idle";
        setResult("idle", "Ready", "Target text moved to the source pane. Select Translate when ready.");
      }
      onNotice(`Text direction changed to ${languageName(saved.source_language)} → ${languageName(saved.target_language)}.`);
    } catch (error) {
      onNotice(`Language direction was not changed: ${errorMessage(error)}`);
    } finally {
      settingsSaving = false;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submitText();
    }
  }

  function stateClass(state: TextResultState): string {
    if (state === "success") return "text-[var(--ti-success)]";
    if (state === "error") return "text-[var(--ti-danger)]";
    if (state === "stale") return "text-[var(--ti-warning)]";
    return "text-[var(--ti-text-muted)]";
  }
</script>

<section class="ti-page ti-page-wide">
  <header class="ti-page-header">
    <div>
      <span class="ti-kicker">Text translation</span>
      <h2 class="ti-page-title">Translate Indonesian and English text.</h2>
      <p class="ti-page-copy">Type or paste text, translate explicitly, then review, edit, or copy the result.</p>
    </div>
    <span class="ti-pill">{textStatus}</span>
  </header>

  <article class="ti-panel overflow-hidden">
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-6 py-4">
      <div>
        <span class="ti-field-label">Source</span>
        <strong class="mt-1 block text-sm">{sourceLanguageName}</strong>
      </div>
      <button type="button" class="ti-button ti-button-secondary min-h-10 px-3" aria-label="Swap source and target languages" disabled={settingsSaving || translating} onclick={() => void swapLanguages()}>
        <ArrowLeftRight size={17} /><span>Swap</span>
      </button>
      <div class="text-right">
        <span class="ti-field-label">Target</span>
        <strong class="mt-1 block text-sm">{targetLanguageName}</strong>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-px bg-[var(--ti-border)]">
      <label class="grid min-w-0 gap-3 bg-[var(--ti-surface)] p-6">
        <div class="flex items-center justify-between gap-3">
          <span class="ti-field-label">Source text</span>
          <span class="text-[11px] text-[var(--ti-text-soft)]">{Array.from(sourceText).length}/{MAX_MANUAL_TRANSLATION_CHARS}</span>
        </div>
        <textarea
          class="ti-field min-h-[320px] resize-none p-4 text-[15px] leading-6 outline-none"
          placeholder="Type or paste text to translate..."
          maxlength={MAX_MANUAL_TRANSLATION_CHARS}
          bind:value={sourceText}
          oninput={handleSourceInput}
          onkeydown={handleKeydown}
          aria-label="Source text"
        ></textarea>
      </label>

      <label class="grid min-w-0 gap-3 bg-[var(--ti-surface)] p-6">
        <div class="flex items-center justify-between gap-3">
          <span class="ti-field-label">Translation</span>
          <strong class={`text-xs ${stateClass(resultState)}`}>{resultLabel}</strong>
        </div>
        <textarea
          class="ti-field min-h-[320px] resize-none p-4 text-[15px] leading-6 outline-none"
          placeholder="Translation will appear here."
          bind:value={targetText}
          oninput={handleTargetInput}
          aria-label="Translated text"
        ></textarea>
      </label>
    </div>

    <footer class="flex items-center justify-between gap-5 border-t border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-6 py-5">
      <div class="min-w-0">
        <p class="m-0 text-sm text-[var(--ti-text-muted)]" aria-live="polite">{resultMessage}</p>
        <p class="mb-0 mt-1 text-xs text-[var(--ti-text-soft)]">Press Ctrl + Enter to translate. Document attachments are not part of this workflow.</p>
      </div>
      <div class="ti-action-row shrink-0">
        <button type="button" class="ti-button ti-button-secondary min-w-28" disabled={!targetText.trim()} onclick={() => void copyTranslation()}>
          {#if copyState === "copied"}<Check size={16} />{:else}<Copy size={16} />{/if}
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
        <button type="button" class="ti-button min-w-32" disabled={translating} onclick={() => void submitText()}>{translating ? "Translating..." : "Translate"}</button>
      </div>
    </footer>
  </article>
</section>
