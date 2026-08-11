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
    { route: "meeting" as const, label: "Meeting", icon: Mic },
    { route: "text" as const, label: "Text", icon: Languages },
    { route: "settings" as const, label: "Settings", icon: Settings },
  ];
</script>

<aside class="flex min-h-screen w-[300px] shrink-0 flex-col border-r border-[var(--ti-border)] bg-[var(--ti-sidebar)] px-5 py-6">
  <header class="flex items-center gap-3 px-2">
    <div class="grid size-11 place-items-center rounded-[14px] border border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-lg font-black">T</div>
    <div>
      <h1 class="m-0 text-[15px] font-black tracking-[-0.02em]">TRANSLATEIT</h1>
      <p class="mt-1 text-xs text-[var(--ti-text-muted)]">Local meeting translator</p>
    </div>
  </header>

  <nav class="mt-10 grid gap-2" aria-label="Primary navigation">
    {#each items as item}
      {@const Icon = item.icon}
      <button
        type="button"
        class={`grid min-h-12 grid-cols-[22px_1fr_18px] items-center gap-3 rounded-[var(--ti-radius-md)] border px-4 text-left text-sm font-semibold transition-colors ${active === item.route ? "border-[var(--ti-border-strong)] bg-[var(--ti-surface-raised)] text-[var(--ti-text)]" : "border-transparent text-[var(--ti-text-muted)] hover:border-[var(--ti-border)] hover:bg-[var(--ti-surface-soft)] hover:text-[var(--ti-text)]"}`}
        aria-current={active === item.route ? "page" : undefined}
        onclick={() => onNavigate(item.route)}
      >
        <Icon size={18} strokeWidth={1.8} />
        <span>{item.label}</span>
        <ChevronRight size={15} strokeWidth={1.8} />
      </button>
    {/each}
  </nav>

  <section class="mt-auto rounded-[var(--ti-radius-md)] border border-[var(--ti-border)] bg-[var(--ti-surface)] p-4">
    <span class="ti-kicker">Local runtime</span>
    <strong class="mt-2 block text-sm">{presence}</strong>
  </section>
</aside>
