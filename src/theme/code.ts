import { theme as defaultTheme } from "@chakra-ui/react";
import { StyleFunctionProps } from "@chakra-ui/theme-tools";

const overrideVariant = (variantName: "solid" | "subtle" | "outline") => {
  return (props: StyleFunctionProps) => {
    const res =
      (
        defaultTheme.components.Code.variants?.[variantName] as (
          props: StyleFunctionProps,
        ) => Record<string, any>
      )?.(props) || {};
    return {
      ...res,
      bg: "none",
      _dark: {
        ...(res._dark || {}),
        bg: "none",
      },
    };
  };
};

const code = {
  components: {
    Code: {
      variants: {
        solid: overrideVariant("solid"),
        subtle: overrideVariant("subtle"),
        outline: overrideVariant("outline"),
      },
    },
  },
};

export default code;
