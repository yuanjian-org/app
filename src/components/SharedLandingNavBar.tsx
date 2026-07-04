import { Box, Flex, HStack, Button, Link, Tooltip } from "@chakra-ui/react";
import NextLink from "next/link";
import DynamicLogo from "components/DynamicLogo";
import { loginUrl } from "shared/loginUrl";
import { RiCustomerServiceFill } from "react-icons/ri";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";

export function SharedLandingNavBar({
  maxWidth = staticPageMaxWidth,
  contactLabel = "联系客服",
  loginLabel = "登录 / 注册",
}: {
  maxWidth?: string;
  contactLabel?: string;
  loginLabel?: string;
}) {
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
        maxW={maxWidth}
        alignItems="center"
        marginX="auto"
      >
        <DynamicLogo />

        <HStack as="nav" spacing={7} fontWeight="bold">
          <Tooltip label={contactLabel}>
            <Link
              href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
              isExternal
            >
              <RiCustomerServiceFill />
            </Link>
          </Tooltip>

          <Button variant="brand" as={NextLink} href={loginUrl()}>
            {loginLabel}
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
