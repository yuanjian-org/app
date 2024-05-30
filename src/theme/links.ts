import colors from "./colors";

const links = {
  components: {
    Link: {
      baseStyle: {
        // If the link color(currently brand.c) is changed, search for all the occurances of the color used and update all instances
        color: colors.brand.c,
        _hover: {
          textDecoration: 'none',
        },
      },
    }
  }
};

export default links;
