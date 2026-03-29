import { Flex } from "@chakra-ui/react";
import Loader from "./Loader";

/**
 * A loading indicator that can fill the whole page.
 */
export default function PageLoader({ loadingText }: { loadingText?: string }) {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      color="gray"
    >
      <Loader loadingText={loadingText} />
    </Flex>
  );
}
