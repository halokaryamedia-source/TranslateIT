<script lang="ts">
  import { ArrowLeftRight } from "@lucide/svelte";
  import { runtimeApi } from "../app/bridge/runtimeApi";
  import { runtimeProductFacade } from "../app/bridge/runtimeProductFacade";
  import { errorMessage, languageName } from "../app/shared/state";
  import type { RuntimeSettings } from "../app/shared/types";

  const MAX_MANUAL_TRANSLATION_CHARS = 2000;
  type TextResultState = "idle" | "translating" | "success" | "stale" | "error";

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
    const previousTarget = targetText;
    translating = true;
    setResult("translating", "Translating", "Using the current local translation runtime.");
    onNotice("Translating with local engine...");

    try {
      const result = await runtimeProductFacade.runProductTranslation(requestSource);
      if (!result.ok) {
        targetText = previousTarget;
        setResult("error", "Couldn't translate", result.message);
        onNotice(`Translation blocked: ${result.message}`);
        return;
      }

      targetText = result.translated;
      lastTranslatedSource = requestSource;
      if (sourceText.trim() === requestSource) {
        setResult("success", "Translated", "Translation completed. You can review or edit the result.");
        onNotice("Translation completed.");
      } else {
        setResult("stale", "Needs update", "The source changed while translating. The result is for the previous source text.");
        onNotice("Translation completed for the previous source text.");
      }
    } catch (error) {
      targetText = previousTarget;
      const message = errorMessage(error);
      setResult("error", "Couldn't translate", message);
      onNotice(`Translation failed: ${message}`);
    } finally {
      translating = false;
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
        lastTranslatedSource = null;
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

<section class="mx-auto grid w-full max-w-[1120px] gap-5 px-8 py-8">
  <header class="flex items-start justify-between gap-8">
    <div>
      <span class="ti-kicker">Text translation</span>
      <h2 class="mb-0 mt-2 text-3xl font-black tracking-[-0.035em]">Translate Indonesian and English text.</h2>
      <p class="mb-0 mt-3 text-sm leading-6 text-[var(--ti-text-muted)]">Type or paste text, translate explicitly, then review or edit the result.</p>
    </div>
    <span class="rounded-full border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-3 py-2 text-xs font-bold text-[var(--ti-text-muted)]">{textStatus}</span>
  </header>

  <article class="ti-panel p-6">
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface-soft)] px-5 py-4">
      <div>
        <span class="text-xs text-[var(--ti-text-muted)]">Source</span>
        <strong class="mt-1 block text-sm">{sourceLanguageName}</strong>
      </div>
      <button type="button" class="ti-button ti-button-secondary min-h-10 px-3" aria-label="Swap source and target languages" disabled={settingsSaving || translating} onclick={() => void swapLanguages()}>
        <ArrowLeftRight size={17} /><span>Swap</span>
      </button>
      <div class="text-right">
        <span class="text-xs text-[var(--ti-text-muted)]">Target</span>
        <strong class="mt-1 block text-sm">{targetLanguageName}</strong>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-2 gap-4">
      <label class="grid gap-2">
        <span class="text-xs font-bold text-[var(--ti-text-muted)]">Source text</span>
        <textarea class="ti-field min-h-[300px] resize-none p-4 text-[15px] leading-6 outline-none" placeholder="Type or paste text to translate..." maxlength={MAX_MANUAL_TRANSLATION_CHARS} bind:value={sourceText} oninput={handleSourceInput} onkeydown={handleKeydown} aria-label="Source text"></textarea>
      </label>

      <label class="grid gap-2">
        <div class="flex items-center justify-between gap-3">
          <span class="text-xs font-bold text-[var(--ti-text-muted)]">Translation</span>
          <strong class={`text-xs ${stateClass(resultState)}`}>{resultLabel}</strong>
        </div>
        <textarea class="ti-field min-h-[300px] resize-none p-4 text-[15px] leading-6 outline-none" placeholder="Translation will appear here." bind:value={targetText} aria-label="Translated text"></textarea>
      </label>
    </div>

    <div class="mt-5 flex items-center justify-between gap-5">
      <div>
        <p class="m-0 text-sm text-[var(--ti-text-muted)]" aria-live="polite">{resultMessage}</p>
        <p class="mb-0 mt-1 text-xs text-[var(--ti-text-soft)]">Press Ctrl + Enter to translate. Document attachments are not part of this workflow.</p>
      </div>
      <button type="button" class="ti-button min-w-32" disabled={translating} onclick={() => void submitText()}>{translating ? "Translating..." : "Translate"}</button>
    </div>
  </article>
</section>
