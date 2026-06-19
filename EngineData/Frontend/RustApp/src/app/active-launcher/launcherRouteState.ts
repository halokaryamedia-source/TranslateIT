import type { SettingsTab } from "../shared/types";
import type { UiRefs } from "./dom";
import { startupTrace } from "./startupDiagnostics";
import { traceUserFlow } from "./userFlowTrace";

export function showHomeRoute(ui: UiRefs, activeSettingsTab: SettingsTab): void {
  document.body.classList.remove("settings-open");
  ui.mainApp.dataset.route = "home";
  ui.settingsPage.classList.add("is-hidden");
  ui.settingsPage.hidden = true;
  ui.settingsPage.style.display = "none";
  ui.homePage.classList.remove("is-hidden");
  ui.homePage.hidden = false;
  ui.homePage.style.display = "grid";
  traceUserFlow("settings.back", {});
  traceUserFlow("home.visible", { activeTab: activeSettingsTab });
}

export function showSettingsRoute(ui: UiRefs, tab: SettingsTab): void {
  document.body.classList.add("settings-open");
  ui.mainApp.dataset.route = "settings";
  ui.homePage.classList.add("is-hidden");
  ui.homePage.hidden = true;
  ui.homePage.style.display = "none";
  ui.settingsPage.classList.remove("is-hidden");
  ui.settingsPage.hidden = false;
  ui.settingsPage.style.display = "grid";
  ui.settingsPage.scrollTop = 0;
  ui.settingsPage.scrollLeft = 0;
  traceUserFlow("settings.opened", { tab });
}

export function assertRouteVisible(ui: UiRefs, route: "home" | "settings", tab?: SettingsTab): boolean {
  const duplicateIds = ["homePage", "settingsPage", "settingsContent", "chatList"].map((id) => document.querySelectorAll(`#${id}`).length > 1).some(Boolean);
  const settingsVisible = !ui.settingsPage.classList.contains("is-hidden") && !ui.settingsPage.hidden && window.getComputedStyle(ui.settingsPage).display !== "none";
  const homeHidden = ui.homePage.classList.contains("is-hidden") && ui.homePage.hidden && window.getComputedStyle(ui.homePage).display === "none";
  const settingsClass = route === "settings" ? (tab ? ui.settingsContent.querySelector(`.settings-view--${tab}`) !== null : ui.settingsContent.children.length > 0) : true;
  const chatListInsideSettings = ui.settingsContent.querySelector("#chatList") !== null;
  const heroVisible = route === "settings" ? window.getComputedStyle(ui.heroTitle).display !== "none" : true;
  const settingsSidebar = document.querySelector<HTMLElement>(".settings-sidebar");
  const sidebarVisible = route === "settings" ? Boolean(settingsSidebar && window.getComputedStyle(settingsSidebar).display !== "none") : true;
  const ok = route === "settings"
    ? settingsVisible && homeHidden && settingsClass && !duplicateIds && !chatListInsideSettings && sidebarVisible && !heroVisible && ui.mainApp.dataset.route === "settings"
    : !ui.homePage.hidden && !ui.settingsPage.hidden && ui.mainApp.dataset.route === "home";
  if (!ok) {
    startupTrace("route.assertion-failed", {
      route,
      tab,
      settingsVisible,
      homeHidden,
      settingsClass,
      duplicateIds,
      chatListInsideSettings,
      heroVisible,
      sidebarVisible,
      mainRoute: ui.mainApp.dataset.route ?? "unknown",
    });
    traceUserFlow("error.user_visible", {
      reason: route === "settings" ? "settings_route_invalid" : "home_route_invalid",
      tab,
    });
  }
  return ok;
}
