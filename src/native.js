/** Statusleiste nur in der Store-Hülle. Im Browser passiert nichts. */
export async function initNative() {
  if (typeof window === "undefined" || !window.Capacitor) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#161a1d" });
  } catch {
    /* Browser oder Plugin fehlt */
  }
}
