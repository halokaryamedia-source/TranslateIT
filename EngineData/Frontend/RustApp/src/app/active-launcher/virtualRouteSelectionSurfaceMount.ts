import {
  bindVirtualRouteSelectionSurface,
  type VirtualRouteSelectionSurfaceBinding,
} from "./virtualRouteSelectionSurfaceRenderer";

let binding: VirtualRouteSelectionSurfaceBinding | null = null;

function ensureHost(): HTMLElement | null {
  const existing = document.querySelector<HTMLElement>("[data-virtual-route-selection-host]");
  if (existing) return existing;

  const captureControls = document.querySelector<HTMLElement>('[aria-label="Capture helper bridge preview controls"]');
  const parent = captureControls?.parentElement;
  if (!parent) return null;

  const host = document.createElement("div");
  host.dataset.virtualRouteSelectionHost = "true";
  host.className = "virtual-route-selection-host";
  parent.insertBefore(host, captureControls.nextSibling);
  return host;
}

export async function mountVirtualRouteSelectionSurface(): Promise<boolean> {
  if (binding) {
    await binding.refresh();
    return true;
  }
  const host = ensureHost();
  if (!host) return false;
  binding = await bindVirtualRouteSelectionSurface(host);
  return true;
}

export function unmountVirtualRouteSelectionSurface(): void {
  binding?.destroy();
  binding = null;
}
