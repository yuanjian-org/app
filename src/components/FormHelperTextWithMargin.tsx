import { FormHelperText } from "@chakra-ui/react";
import { PropsWithChildren } from "react";

/**
 * TODO: Use theme css instead
 */
export default function FormHelperTextWithMargin({ children }:
  PropsWithChildren
) {
  return <FormHelperText mb={2}>{children}</FormHelperText>;
}
