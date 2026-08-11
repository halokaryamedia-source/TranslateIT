<script lang="ts">
  type Tone = "neutral" | "good" | "warning" | "danger";

  let {
    label,
    tone = "neutral",
  }: {
    label: string;
    tone?: Tone;
  } = $props();

  const toneClass: Record<Tone, string> = {
    neutral: "border-[var(--ti-border)] bg-[var(--ti-surface-soft)] text-[var(--ti-text-muted)]",
    good: "border-[var(--ti-success-border)] bg-[var(--ti-success-surface)] text-[var(--ti-success)]",
    warning: "border-[var(--ti-warning-border)] bg-[var(--ti-warning-surface)] text-[var(--ti-warning)]",
    danger: "border-[var(--ti-danger-border)] bg-[var(--ti-danger-surface)] text-[var(--ti-danger)]",
  };
</script>

<span class={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-3 text-xs font-bold ${toneClass[tone]}`}>
  {label}
</span>
