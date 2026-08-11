<script lang="ts">
  import { ChevronRight, Languages, Mic, Settings } from "@lucide/svelte";

  type AppRoute = "meeting" | "text" | "settings";

  let {
    active,
    presence,
    onNavigate,
  }: {
    active: AppRoute;
    presence: string;
    onNavigate: (route: AppRoute) => void;
  } = $props();

  const items = [
    { route: "meeting" as const, label: "Meeting", description: "Live voice", icon: Mic },
    { route: "text" as const, label: "Text", description: "ID ↔ EN", icon: Languages },
    { route: "settings" as const, label: "Settings", description: "Devices & setup", icon: Settings },
  ];
</script>

<aside class="flex min-h-screen w-[var(--ti-sidebar-width)] shrink-0 flex-col border-r border-[var(--ti-border)] bg-[var(--ti-sidebar)] px-5 py-6">
  <header class="flex items-center gap-3 px-2">
    <div class="grid size-11 place-items-center rounded-[14px] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-lg font-black">T</div>
    <div class="min-w-0">
      <h1 class="m-0 truncate text-[15px] font-black tracking-[-0.02em]">TRANSLATEIT</h1>
      <p class="mt-1 truncate text-xs text-[var(--ti-text-muted)]">Local meeting translator</p>
    </div>
  </header>

  <nav class="mt-10 grid gap-2" aria-label="Primary navigation">
    {#each items as item}
      {@const Icon = item.icon}
      <button
        type="button"
        class={`group grid min-h-[58px] grid-cols-[22px_1fr_18px] items-center gap-3 rounded-[var(--ti-radius-md)] border px-4 text-left transition-colors ${active === item.route ? "border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-[var(--ti-text)]" : "border-transparent text-[var(--ti-text-muted)] hover:border-[var(--ti-border)] hover:bg-[var(--ti-surface-soft)] hover:text-[var(--ti-text)]"}`}
        aria-current={active === item.route ? "page" : undefined}
        onclick={() => onNavigate(item.route)}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span class="min-w-0">
          <strong class="block truncate text-sm font-bold">{item.label}</strong>
          <small class={`mt-0.5 block truncate text-[11px] ${active === item.route ? "text-[var(--ti-text-muted)]" : "text-[var(--ti-text-soft)]"}`}>{item.description}</small>
        </span>
        <ChevronRight class="opacity-60 transition-transform group-hover:translate-x-0.5" size={15} strokeWidth={1.8} />
      </button>
    {/each}
  </nav>

  <section class="mt-auto rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface)] p-4">
    <div class="flex items-center gap-2">
      <span class={`size-2 rounded-full ${presence === "Live" || presence === "Ready" ? "bg-[var(--ti-success)]" : presence === "Setup Needed" ? "bg-[var(--ti-warning)]" : "bg-[var(--ti-text-soft)]"}`}></span>
      <span class="ti-kicker">Local runtime</span>
    </div>
    <strong class="mt-2 block text-sm">{presence}</strong>
    <p class="mb-0 mt-1 text-[11px] leading-5 text-[var(--ti-text-soft)]">Runtime truth comes from the local desktop bridge.</p>
  </section>
</aside>
