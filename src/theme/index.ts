import { extendTheme } from '@chakra-ui/react';
import breakpoints from './breakpoints';
import colors from "./colors";
import links from './links';
import buttons from './buttons';
import avatars from './avatars';

const global = {
  colors,
  styles: {
    global: {
      'html, body': {
        color: colors.text,
      }
    }
  },
};

export default extendTheme(
	{ breakpoints },
  global,
  links,
  buttons,
  avatars,
);
