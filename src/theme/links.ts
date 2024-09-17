import colors from "./colors";

// If changing this line, also update link color in  MarkdownStyler.module.css.
export const linkBaseColor = colors.brand.c;

const links = {
  components: {
    Link: {
      baseStyle: {
        color: linkBaseColor,
        _hover: {
          textDecoration: 'none',
        },
      },
    }
  }
};

export default links;
