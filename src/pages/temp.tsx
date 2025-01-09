import { Box, Button, Heading, Text, VStack, Wrap, WrapItem, Link, Spacer, Stack, HStack } from "@chakra-ui/react";
import { fullPage } from "AppPage";
import { SmallGrayText } from "components/SmallGrayText";
import TopBar, { topBarPaddings } from "components/TopBar";
import { FullTextSearchBox } from "components/UserCards";
import { useState } from "react";
import { breakpoint, componentSpacing } from "theme/metrics";

export default fullPage(() => {
  const [searchTerm, setSearchTerm] = useState<string>("");

  return <>
    <TopBar pb={0}>
      <VStack align="start">
        <Stack
          w="full"
          justify="space-between"
          align={{ base: "start", [breakpoint]: "center" }}
          direction={{ base: "column", [breakpoint]: "row" }}
          spacing={componentSpacing}
          {...topBarPaddings}
        >

          <Wrap align="center" spacing={componentSpacing}>
            <WrapItem>
              <Heading size="md">请选择至少五位导师</Heading>
            </WrapItem>
            <WrapItem>
              <Button disabled>已选三位</Button>
            </WrapItem>
            <Spacer />
            <WrapItem>
              <FullTextSearchBox
                value={searchTerm}
                setValue={setSearchTerm}
                shortPlaceholder
              />
            </WrapItem>
          </Wrap>

          <HStack spacing={2}>
            <Link href="#">
              如何选择导师
            </Link>
            <Text color="gray">|</Text>
            <Link href="#">
              更新个人特质
            </Link>
          </HStack>
        </Stack>

        <Box
          w="full"
          bg="orange.50"
          py={2}
          px={4}
        >
          <SmallGrayText>
            ⭐ 是匹配偏好与你的个人特质比较匹配的导师。推荐仅供参考，选择权在你。
          </SmallGrayText>
        </Box>
      </VStack>
    </TopBar>

    {Array.from({ length: 100 }, (_, i) => (
      <Box key={i} p={4} boxShadow="sm" borderRadius="md">
        <Text>Item {i + 1}</Text>
      </Box>
    ))}

  </>;
}, "选择一对一导师");
