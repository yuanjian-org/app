import colors from "./colors";

const links = {
  components: {
    Link: {
      baseStyle: {
        // If the link color is updated, search for the hex value in the repository and update all instances manually
        color: colors.brand.c,
        _hover: {
          textDecoration: 'none',
        },
      },
    }
  }
};

export default links;
