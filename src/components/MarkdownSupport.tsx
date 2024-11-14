import {
    Text,
    Link,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

export const markdownSyntaxUrl = "https://markdown.com.cn/basic-syntax";

export default function MarkdownSupport({ prefix }: {
  prefix?: string,
}) {
  return <Link target="_blank" href={markdownSyntaxUrl}>
    <HStack>
      <Text>{prefix && prefix}支持 Markdown 格式</Text>
      <Icon as={ExternalLinkIcon} />
    </HStack>
  </Link>;
}
