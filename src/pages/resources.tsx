import { Box } from "@chakra-ui/react";
import { barePage } from "AppPage";

export default barePage(() => {
  return (
    <Box width="100%" height="100vh" position="relative">
      <iframe
        src="https://yuanjian.notion.site/ebd//3aff2d84173f46f09dd25ea339f2cd8d"
        width="100%"
        height="100%"
      />

      {/* An invisible box to cover the top banner of the iframe */}
      <Box position="absolute" top="0" left="0" w="100%" h="40px" bg="white" />
    </Box>
  );
}, "资源推荐");
