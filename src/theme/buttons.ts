import { mode, StyleFunctionProps } from "@chakra-ui/theme-tools";
import colors from "./colors";

const buttons = {
  components: {
    Button: {
      variants: {
        brand: (props: StyleFunctionProps) => ({
          bg: mode(colors.brand[500], colors.brand.c)(props),
          color: "white",
          _hover: {
            bg: mode(colors.brand[600], colors.brand.c)(props),
            _disabled: {
              bg: mode(colors.brand[600], colors.brand.c)(props),
            }
          },
        }),

        outline: {
          _hover: {
            bg: "gray.200",
          },
        },
  
        ghost: {
          _hover: {
            bg: "gray.200",
          },
          bg: "transparent",
        }
      },
    },
  },
};

export default buttons;
