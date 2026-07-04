import {
  Box,
  Button,
  Flex,
  HStack,
  Link,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  pageMarginX,
  staticPageMaxWidth,
  staticPageMaxWidthWide,
} from "theme/metrics";
import { AppPageType } from "../AppPage";
import { staticUrlPrefix } from "../static";
import NextLink from "next/link";
import DynamicLogo from "components/DynamicLogo";
import { useRouter } from "next/router";
import { loginUrl } from "shared/loginUrl";
import { activeNavLinkColor } from "theme/colors";
import { RiCustomerServiceFill } from "react-icons/ri";
import { ShowOnDesktop } from "./Show";
import { features } from "shared/Features";

// Do not use the same-named variable in theme/colors becuase it's a bit too
// light on the static navbar.
const inactiveNavLinkColor = "gray.700";

/**
 * The top navigation bar for static (non-app) pages.
 */
export default function StaticNavBar({
  pageType,
}: { pageType?: AppPageType } = {}) {
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
        maxW={pageType === "wide" ? staticPageMaxWidthWide : staticPageMaxWidth}
        alignItems="center" // Center content vertically
        marginX="auto" // Centers content horizontally
      >
        <DynamicLogo />

        <HStack as="nav" spacing={7} fontWeight="bold">
          <ShowOnDesktop>
            <NavLink href={staticUrlPrefix} current={current} text="首页" />
          </ShowOnDesktop>

          {features.projects ? (
            <NavLink
              href={`${staticUrlPrefix}/projects`}
              current={current}
              text="挑战问题"
            />
          ) : (
            <>
              <NavLink
                href={`${staticUrlPrefix}/articles`}
                current={current}
                text="文章"
              />
              <NextLink href={loginUrl()}>
                <Text color={inactiveNavLinkColor}>进入远图</Text>
              </NextLink>
            </>
          )}

          <Tooltip label="联系客服">
            <Link
              href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
              isExternal
            >
              <RiCustomerServiceFill />
            </Link>
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
