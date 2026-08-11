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
    good: "border-[#285942] bg-[var(--ti-success-surface)] text-[var(--ti-success)]",
    warning: "border-[#594521] bg-[var(--ti-warning-surface)] text-[var(--ti-warning)]",
    danger: "border-[#633139] bg-[var(--ti-danger-surface)] text-[var(--ti-danger)]",
  };
</script>

<span class={`inline-flex min-h-7 items-center rounded-full border px-3 text-xs font-bold ${toneClass[tone]}`}>
  {label}
</span>
