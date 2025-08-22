import { Box, Button, Flex, HStack, Text, Tooltip } from "@chakra-ui/react";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import { staticUrlPrefix } from "../static";
import NextLink from "next/link";
import yuanjianLogo80x80 from "../../public/img/yuanjian-logo-80x80.png";
import Image from "next/image";
import { useRouter } from "next/router";
import { loginUrl } from "pages/auth/login";
import { activeNavLinkColor } from "theme/colors";
import { RiCustomerServiceFill } from "react-icons/ri";
import { ShowOnDesktop } from "./Show";

// Do not use the same-named variable in theme/colors becuase it's a bit too
// light on the static navbar.
const inactiveNavLinkColor = "gray.700";

/**
 * The top navigation bar for static (non-app) pages.
 */
export default function StaticNavBar() {
  const current = useRouter().asPath;

  return (
    <Box
      as="nav"
      w="100%"
      bgColor="white"
      boxShadow="sm"
      position="sticky"
      top="0"
      zIndex="999"
    >
      <Flex
        height={16}
        justifyContent="space-between"
        paddingX={pageMarginX}
        maxW={staticPageMaxWidth}
        alignItems="center" // Center content vertically
        marginX="auto" // Centers content horizontally
      >
        <NextLink href={staticUrlPrefix}>
          <Image src={yuanjianLogo80x80} alt="图标" width={30} />
        </NextLink>

        <HStack as="nav" spacing={7} fontWeight="bold">
          <ShowOnDesktop>
            <NavLink href={staticUrlPrefix} current={current} text="首页" />
          </ShowOnDesktop>

          <NavLink
            href={`${staticUrlPrefix}/articles`}
            current={current}
            text="文章"
          />

          <NextLink href={loginUrl()}>
            <Text color={inactiveNavLinkColor}>进入远图</Text>
          </NextLink>

          <Tooltip label="联系客服">
            <NextLink
              href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
              target="_blank"
            >
              <RiCustomerServiceFill />
            </NextLink>
          </Tooltip>

          <Button variant="brand" as={NextLink} href={loginUrl()}>
            登录 / 注册
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}

function NavLink({
  href,
  current,
  text,
}: {
  href: string;
  current: string;
  text: string;
}) {
  return (
    <NextLink href={href}>
      <Text
        color={current === href ? activeNavLinkColor : inactiveNavLinkColor}
      >
        {text}
      </Text>
    </NextLink>
  );
}
