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
  publicPageMaxWidth,
  publicPageMaxWidthWide,
} from "theme/metrics";
import { AppPageType } from "../AppPage";
import { publicUrlPrefix } from "../publicUrl";
import NextLink from "next/link";
import DynamicLogo from "components/DynamicLogo";
import { useRouter } from "next/router";
import { loginUrl } from "shared/loginUrl";
import { activeNavLinkColor } from "theme/colors";
import { RiCustomerServiceFill } from "react-icons/ri";
import T from "components/T";
import { useTranslation } from "next-i18next/pages";
import LanguageToggle from "./LanguageToggle";

// Do not use the same-named variable in theme/colors becuase it's a bit too
// light on the static navbar.
const inactiveNavLinkColor = "gray.700";

/**
 * The top navigation bar for static (non-app) pages.
 */
export default function PublicNavBar({
  pageType,
}: { pageType?: AppPageType } = {}) {
  const { t } = useTranslation("common");
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
        maxW={pageType === "wide" ? publicPageMaxWidthWide : publicPageMaxWidth}
        alignItems="center" // Center content vertically
        marginX="auto" // Centers content horizontally
      >
        <DynamicLogo />

        <HStack as="nav" spacing={7} fontWeight="bold">
          {/* Directly use env var to allow tree shaking */}
          {process.env.NEXT_PUBLIC_WHITE_LABEL === "yuantu" && (
            <NavLink href={publicUrlPrefix} current={current} text="首页" />
          )}

          {process.env.NEXT_PUBLIC_ENABLE_PUBLIC_ORGS_MENTORS === "true" && (
            <>
              <NavLink
                href={`${publicUrlPrefix}/mentors`}
                current={current}
                text="导师"
              />
              <NavLink
                href={`${publicUrlPrefix}/orgs`}
                current={current}
                text="机构"
              />
            </>
          )}

          {process.env.NEXT_PUBLIC_ENABLE_PROJECTS === "true" && (
            <NavLink
              href={`${publicUrlPrefix}/projects`}
              current={current}
              text="项目"
            />
          )}

          {process.env.NEXT_PUBLIC_WHITE_LABEL === "yuantu" && (
            <NavLink
              href={`${publicUrlPrefix}/articles`}
              current={current}
              text="文章"
            />
          )}

          {process.env.NEXT_PUBLIC_ENABLE_ENGLISH === "true" && (
            <LanguageToggle />
          )}

          <Tooltip label={t("联系客服")}>
            <Link
              href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
              isExternal
            >
              <RiCustomerServiceFill />
            </Link>
          </Tooltip>

          <Button variant="brand" as={NextLink} href={loginUrl()}>
            <T>登录 / 注册</T>
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
        <T>{text}</T>
      </Text>
    </NextLink>
  );
}
