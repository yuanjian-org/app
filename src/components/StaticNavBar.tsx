import React from 'react';
import {
  Box, Button, Flex, HStack
 } from '@chakra-ui/react';
import { pageMarginX, staticPageMaxWidth } from 'theme/metrics';
import { staticUrlPrefix } from '../static';
import NextLink from 'next/link';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';
import Image from "next/image";
import { useRouter } from 'next/router';
import { parseQueryString } from 'shared/strings';
import { callbackUrlKey } from 'pages/auth/login';

/**
 * The top navigation bar for static (non-app) pages.
 */
export default function StaticNavBar() {
  const router = useRouter();
  const callbackUrl = parseQueryString(router, callbackUrlKey);
  const loginUrl = `/auth/login${!callbackUrl ? "" :
    `?${callbackUrlKey}=${encodeURIComponent(callbackUrl)}`}`;

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

        <HStack as="nav" spacing={4}>
          {/* <Link href="/">Home</Link> */}
          <Button variant="brand" as={NextLink} href={loginUrl}>
            登录 / 注册
          </Button>
        </HStack>
    </Flex>
  </Box>;
};
