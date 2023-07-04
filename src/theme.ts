import { extendTheme } from '@chakra-ui/react';
import { mode, StyleFunctionProps } from "@chakra-ui/theme-tools";

import { globalStyles } from './horizon-ui/theme/styles';
import { CardComponent } from './horizon-ui/theme/additions/card/card';
import { buttonStyles } from './horizon-ui/theme//components/button';
import { badgeStyles } from './horizon-ui/theme/components/badge';
import { inputStyles } from './horizon-ui/theme/components/input';
import { progressStyles } from './horizon-ui/theme/components/progress';
import { sliderStyles } from './horizon-ui/theme/components/slider';
import { textareaStyles } from './horizon-ui/theme/components/textarea';
import { switchStyles } from './horizon-ui/theme/components/switch';
import { linkStyles } from './horizon-ui/theme/components/link';
import { breakpoints } from './horizon-ui/theme/foundations/breakpoints';

// Yuanjian's brand colors. 
// See https://www.notion.so/yuanjian/d443cc0615ad48c69ef6d6a59510836f?pvs=4#e2bd7d60169948a584b6291bdb8e3d0f
const brandA = "#171C8F";
const brandB = "#00A3E0";
const brandC = "#0047BB";
const brandD = "#69B3E7";

const global = {
  // TODO: Use Yuanjian brand for all color variations.
  colors: {
    brand: {
      100: "#E9E3FF",
      200: "#422AFB",
      300: "#422AFB",
      400: "#7551FF",
      500: "#2351c7", // derived from brandC. Was "#422AFB"
      600: "#003bad", // derived from brandC. Was "#3311DB"
      700: "#02044A",
      800: "#190793",
      900: "#11047A",
      a: "#171C8F",
      b: "#00A3E0",
      c: "#0047BB",
      d: "#69B3E7",
    },
    // blue: {
    //   50: "#EFF4FB",
    //   500: "#3965FF",
    // },
  },
  styles: {
    global: {
      'html, body': {
        color: 'gray.700',
      }
    }
  },
};

const buttons = {
  components: {
    Button: {
      variants: {
        brand: (props: StyleFunctionProps) => ({
          bg: mode("brand.500", "brand.c")(props),
          color: "white",
          _hover: {
            bg: mode("brand.600", "brand.c")(props),
          },
        }),
      },
    },
  },
};

const links = {
	components: {
		Link: {
			baseStyle: {
        color: brandC,
				_hover: {
					textDecoration: 'none',
				},
			},
		}
	}
};

export default extendTheme(
	{ breakpoints },
  global,
  links,
  buttons,
);
