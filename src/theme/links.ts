import colors from "./colors";

const links = {
  components: {
    Link: {
      baseStyle: {
        // If changing this line, also update link color in MarkdownStyler.module.css
        color: colors.brand.c,
        _hover: {
          textDecoration: 'none',
        },
      },
    }
  }
};

export default links;
