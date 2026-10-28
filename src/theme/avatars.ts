// Code template from https://chakra-ui.com/docs/components/avatar/theming
import { avatarAnatomy } from "@chakra-ui/anatomy";
import { createMultiStyleConfigHelpers, cssVar } from "@chakra-ui/react";
import { isDark } from "@chakra-ui/theme-tools";
import colors from "./colors";

const { definePartsStyle, defineMultiStyleConfig } =
  createMultiStyleConfigHelpers(avatarAnatomy.keys);

const $bg = cssVar("avatar-bg");

/**
 * Generates a deterministic hex color from the full name string using
 * MurmurHash3-style bit mixing so that names sharing leading characters
 * (e.g., "匿名楼主", "匿名 甲", "匿名 乙" or same surnames) still receive
 * distinct avatar colors across all RGB channels.
 */
export function nameToColor(name: string): string {
  if (name.length === 0) return "#a0aec0";
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = Math.imul(hash ^ name.charCodeAt(i), 0x85ebca6b);
    hash ^= hash >>> 13;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0xc2b2ae35);
  hash ^= hash >>> 16;

  let color = "#";
  for (let j = 0; j < 3; j += 1) {
    const value = (hash >>> (j * 8)) & 255;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

const baseStyle = definePartsStyle((props) => {
  const name = typeof props.name === "string" ? props.name : "";
  const bg = name ? nameToColor(name) : "colors.gray.400";
  const color = isDark(bg)(props.theme) ? "white" : "gray.800";

  return {
    container: {
      borderColor: colors.backgroundLight,
      color,
      "&:not([data-loaded])": {
        [$bg.variable]: bg,
      },
    },
  };
});

const avatars = {
  components: {
    Avatar: defineMultiStyleConfig({ baseStyle }),
  },
};

export default avatars;
