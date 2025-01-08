import React from 'react';
import {
  Box, Button, Flex, HStack, Text,
 } from '@chakra-ui/react';
import { pageMarginX, staticPageMaxWidth } from 'theme/metrics';
import { staticUrlPrefix } from '../static';
import NextLink from 'next/link';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';
import Image from "next/image";
import { useRouter } from 'next/router';
import { parseQueryString } from 'shared/strings';
import { callbackUrlKey } from 'pages/auth/login';
import { activeNavLinkColor } from 'theme/colors';

// Do not use the same-named variable in theme/colors becuase it's a bit too
// light on the static navbar.
const inactiveNavLinkColor = "gray.700";

/**
 * The top navigation bar for static (non-app) pages.
 */
export default function StaticNavBar() {
  const router = useRouter();
  const callbackUrl = parseQueryString(router, callbackUrlKey);
  const loginUrl = `/auth/login${!callbackUrl ? "" :
    `?${callbackUrlKey}=${encodeURIComponent(callbackUrl)}`}`;

  const current = router.asPath;

  return <Box
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
          <Image
            src={yuanjianLogo80x80}
            alt="图标"
            width={30}
          />
        </NextLink>

        <HStack as="nav" spacing={7} fontWeight="bold">

          <NavLink href={staticUrlPrefix} current={current}
            text="首页" />

          <NavLink href={`${staticUrlPrefix}/articles`} current={current}
            text="文章" />

          <NextLink href="/">
            <Text color={inactiveNavLinkColor}>进入平台</Text>
          </NextLink>

          <Button variant="brand" as={NextLink} href={loginUrl}>
            登录 / 注册
          </Button>

        </HStack>
    </Flex>
  </Box>;
};

function NavLink({ href, current, text }: {
  href: string;
  current: string;
  text: string;
}) {
  return <NextLink href={href}>
    <Text color={current === href ? activeNavLinkColor : inactiveNavLinkColor}>
      {text}
    </Text>
  </NextLink>;
}
