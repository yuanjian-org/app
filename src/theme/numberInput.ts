const numberInput = {
  components: {
    NumberInput: {
      baseStyle: {
        field: {
          borderRadius: "5px",
          marginLeft: "2px",
          marginRight: "2px",
          maxW: "55px",
        },
      },
      sizes: {
        xs: {
          field: {
            fontSize: "xs",
          },
        },
      },
      defaultProps: {
        size: "xs",
        min: 0,
        max: 10,
      },
    },
  },
};

export default numberInput;
