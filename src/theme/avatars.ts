// Code template from https://chakra-ui.com/docs/components/avatar/theming
import { avatarAnatomy } from "@chakra-ui/anatomy";
import { createMultiStyleConfigHelpers } from "@chakra-ui/react";
import colors from "./colors";

const { definePartsStyle, defineMultiStyleConfig } =
  createMultiStyleConfigHelpers(avatarAnatomy.keys);

const baseStyle = definePartsStyle({
  container: {
    borderColor: colors.backgroundLight,
  },
});

const avatars = {
  components: {
    Avatar: defineMultiStyleConfig({ baseStyle }),
  },
};

export default avatars;
