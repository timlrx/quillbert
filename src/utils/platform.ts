import { family as osFamily, platform } from "@tauri-apps/plugin-os";

const currentPlatform = platform();

export const isWeb = !("__TAURI_OS_PLUGIN_INTERNALS__" in window);
export const isMobile = isWeb
  ? navigator.userAgent.toLowerCase().includes("mobile")
  : platform() === "android";
export const isDesktop = !isMobile;
export const isMac = currentPlatform.includes("mac");
export const isWin = currentPlatform.includes("win");
export const isLinux = currentPlatform.includes("linux");
export const appScale = isMobile ? 0.5 : 1;

export function family() {
  if (isWeb) {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("windows")) {
      return "windows";
    } else {
      return "unix";
    }
  } else {
    return osFamily();
  }
}
