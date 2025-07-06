export function isBrowserOnMac() {
  return (
    typeof navigator !== "undefined" &&
    /macOS|Macintosh|MacIntel|MacPPC|Mac68K/.test(navigator.userAgent)
  );
}

export function cmdOrCtrlChar() {
  return isBrowserOnMac() ? "⌘" : "Ctrl";
}
