import {
  loadVirtualRouteSelectionSurfaceState,
  saveVirtualRouteSelectionSurfaceSelection,
  type VirtualRouteSelectionSurfaceState,
} from "./virtualRouteSelectionSurfaceModel";

export type VirtualRouteSelectionSurfaceBinding = {
  refresh(): Promise<void>;
  destroy(): void;
};

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optionMarkup(option: { label: string; value: string; selected: boolean; preferred: boolean }): string {
  const flags = [option.selected ? "selected" : "", option.preferred ? "preferred" : ""].filter(Boolean).join(" • ");
  const label = escapeHtml(option.label);
  const value = escapeHtml(option.value);
  const suffix = flags ? ` (${escapeHtml(flags)})` : "";
  return `<option value="${value}" ${option.preferred ? "selected" : ""}>${label}${suffix}</option>`;
}

function selectMarkup(name: string, options: VirtualRouteSelectionSurfaceState["output_options"]): string {
  const empty = `<option value="">Auto-detect virtual device</option>`;
  return `<select data-virtual-route-field="${escapeHtml(name)}">${empty}${options.map(optionMarkup).join("")}</select>`;
}

function statusMarkup(state: VirtualRouteSelectionSurfaceState): string {
  const blocker = escapeHtml(state.blocker || "none");
  const nextAction = escapeHtml(state.next_action);
  const summary = escapeHtml(state.summary);
  const evidence = state.evidence_path ? `<span>Evidence: ${escapeHtml(state.evidence_path)}</span>` : "";
  return `
    <div class="virtual-route-selection-status" data-virtual-route-ready="${state.route_ready}">
      <strong>${state.route_ready ? "Route devices ready" : "Route devices need attention"}</strong>
      <span>Next: ${nextAction}</span>
      <span>Blocker: ${blocker}</span>
      ${evidence}
      <small>${summary}</small>
    </div>
  `;
}

function render(root: HTMLElement, state: VirtualRouteSelectionSurfaceState): void {
  root.innerHTML = `
    <section class="virtual-route-selection-surface" aria-label="Virtual audio route device selection">
      <div class="virtual-route-selection-header">
        <strong>Virtual Route Devices</strong>
        <small>Select preferred virtual output/input devices before runtime validation.</small>
      </div>
      <label>
        Output device
        ${selectMarkup("output", state.output_options)}
      </label>
      <label>
        Input device
        ${selectMarkup("input", state.input_options)}
      </label>
      <div class="virtual-route-selection-actions">
        <button type="button" data-virtual-route-action="save">Save Route Devices</button>
        <button type="button" data-virtual-route-action="refresh">Refresh Devices</button>
      </div>
      ${statusMarkup(state)}
    </section>
  `;
}

function selectedValue(root: HTMLElement, field: "output" | "input"): string | null {
  const value = root.querySelector<HTMLSelectElement>(`[data-virtual-route-field="${field}"]`)?.value?.trim();
  return value || null;
}

export async function bindVirtualRouteSelectionSurface(root: HTMLElement): Promise<VirtualRouteSelectionSurfaceBinding> {
  let destroyed = false;

  async function refresh(): Promise<void> {
    if (destroyed) return;
    const state = await loadVirtualRouteSelectionSurfaceState();
    if (!destroyed) render(root, state);
  }

  async function save(): Promise<void> {
    if (destroyed) return;
    const state = await saveVirtualRouteSelectionSurfaceSelection(
      selectedValue(root, "output"),
      selectedValue(root, "input"),
    );
    if (!destroyed) render(root, state);
  }

  const onClick = (event: MouseEvent): void => {
    const action = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-virtual-route-action]")?.dataset.virtualRouteAction;
    if (action === "refresh") void refresh();
    if (action === "save") void save();
  };

  root.addEventListener("click", onClick);
  await refresh();

  return {
    refresh,
    destroy() {
      destroyed = true;
      root.removeEventListener("click", onClick);
    },
  };
}
