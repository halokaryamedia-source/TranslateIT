<script lang="ts">
  import StatusBadge from "./StatusBadge.svelte";

  type Tone = "neutral" | "good" | "warning" | "danger";

  let {
    label,
    value,
    detail = "",
    status = "",
    tone = "neutral",
  }: {
    label: string;
    value: string;
    detail?: string;
    status?: string;
    tone?: Tone;
  } = $props();
</script>

<div class="flex min-h-[78px] items-center justify-between gap-6 px-5 py-4">
  <div class="min-w-0">
    <span class="block text-xs font-medium text-[var(--ti-text-muted)]">{label}</span>
    <strong class="mt-1 block truncate text-sm font-semibold text-[var(--ti-text)]" title={value}>{value}</strong>
    {#if detail}
      <small class="mt-1 block text-xs leading-5 text-[var(--ti-text-soft)]">{detail}</small>
    {/if}
  </div>
  {#if status}
    <StatusBadge label={status} {tone} />
  {/if}
</div>
