// TODO: Apply Yuanjian brand color theme to all color variations.
const colors = {
  
  text: "gray.700",
  backgroundLight: "#f1f3f4", // "gray.100" == "#eef2f6",
  backgroundDark: "gray.900",

  brand: {
    100: "#E9E3FF",
    200: "#422AFB",
    300: "#422AFB",
    400: "#7551FF",
    500: "#2351c7", // derived from brand.c. Was "#422AFB"
    600: "#003bad", // derived from brand.c. Was "#3311DB"
    700: "#02044A",
    800: "#190793",
    900: "#11047A",

    // Yuanjian's brand colors. 
    // See https://www.notion.so/yuanjian/d443cc0615ad48c69ef6d6a59510836f?pvs=4#e2bd7d60169948a584b6291bdb8e3d0f
    a: "#171C8F",
    b: "#00A3E0",
    c: "#0047BB",
    d: "#69B3E7",
  },

  disabled: "gray",

  // blue: {
  //   50: "#EFF4FB",
  //   500: "#3965FF",
  // },
};

export default colors;

export const headingColor = "gray.600";

export const inactiveNavLinkColor = "gray.600";
export const activeNavLinkColor = "brand.c";

export const okTextColor = "green";
export const warningTextColor = "yellow.600";
export const actionRequiredTextColor = "brown";
