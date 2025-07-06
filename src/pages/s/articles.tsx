import {
  UnorderedList,
  VStack,
  ListItem,
  Link,
  HStack,
  Text,
} from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import NextLink from "next/link";
import { MdOutlineDescription } from "react-icons/md";
import { paragraphSpacing } from "theme/metrics";

export default function Page() {
  return (
    <VStack align="start">
      <PageBreadcrumb current="社会导师系列文章" />
      <Text mb={paragraphSpacing}>
        为了服务好每一位学员，真正做到高质量的个性化支持，我们为社会导师制开发了一套完整的
        {}
        方法体系和运营平台，并在实践探索中不断改进。我们把经验总结分享出来，期望与
        {}
        教育工作者和研究人员共同探讨社会导师制的原理与最佳实践。同时，我们也期待更多机构
        {}能够尝试社会导师或类似的服务，为更多年轻人带去关怀和帮助。
      </Text>
      <Text mb={paragraphSpacing * 2}>
        随着系统日趋完善，我们将陆续分享更多文章，敬请期待：
      </Text>
      <UnorderedList spacing={paragraphSpacing}>
        <ListItem>
          初心与理念
          <HStack>
            <MdOutlineDescription />
            <Link as={NextLink} href="/s/why">
              从乡土到全球：构想社会导师制
            </Link>
          </HStack>
          <HStack>
            <MdOutlineDescription />
            <Link as={NextLink} href="/s/meritocracy">
              成功背后的逻辑
            </Link>
          </HStack>
          <HStack>
            <MdOutlineDescription />
            <Link as={NextLink} href="/s/armor-heart">
              铠甲与火苗
            </Link>
          </HStack>
        </ListItem>
        <ListItem>
          探索与实践
          <HStack>
            <MdOutlineDescription />
            <Link as={NextLink} href="/s/match">
              设计科学高效的师生匹配系统
            </Link>
          </HStack>
        </ListItem>
      </UnorderedList>
    </VStack>
  );
}

Page.title = "文章";
