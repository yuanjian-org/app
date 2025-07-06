import { Flex, Spacer, VStack } from "@chakra-ui/react";
import Image from "next/image";
import { componentSpacing } from "theme/metrics";
import yuanjianLogo80x80 from "../../public/img/yuanjian-logo-80x80.png";
import { PropsWithChildren } from "react";
import Footer from "./Footer";
import NextLink from "next/link";
import { staticUrlPrefix } from "static";

export default function AuthPageContainer({ children }: PropsWithChildren) {
  return (
    <Flex direction="column" alignItems="center" minHeight="100vh">
      <VStack
        align="left"
        spacing={componentSpacing}
        width={350}
        marginTop={40}
      >
        <NextLink href={staticUrlPrefix}>
          <Image alt="图标" width={60} src={yuanjianLogo80x80} />
        </NextLink>

        {children}
      </VStack>
      <Spacer />
      <Footer />
    </Flex>
  );
}
