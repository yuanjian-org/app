import { Flex } from "@chakra-ui/react";
import Loader from "./Loader";
import Head from "next/head";

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
      <Head>
        <title>{loadingText || "加载中..."}</title>
      </Head>
      <Loader loadingText={loadingText} />
    </Flex>
  );
}
