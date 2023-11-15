export * from './constant';
export * from './typing';
export * from './utils/token';
export * from './utils/format';
export * from './utils/merge';
export * from './config/server';
export * from './config/client';
export * from './config/build';

export function getOS(): "macos" | "ios" | "windows" | "android" | "linux" | undefined {
  // TODO support server
  if (typeof window === "undefined") {
    return undefined;
  }

  let userAgent = window.navigator.userAgent.toLowerCase(),
    macosPlatforms = /(macintosh|macintel|macppc|mac68k|macos)/i,
    windowsPlatforms = /(win32|win64|windows|wince)/i,
    iosPlatforms = /(iphone|ipad|ipod)/i,
    os = undefined;

  if (macosPlatforms.test(userAgent)) {
    return "macos";
  } else if (iosPlatforms.test(userAgent)) {
    return "ios";
  } else if (windowsPlatforms.test(userAgent)) {
    return "windows";
  } else if (/android/.test(userAgent)) {
    return "android";
  } else if (!os && /linux/.test(userAgent)) {
    return "linux";
  }

  return undefined;
}
