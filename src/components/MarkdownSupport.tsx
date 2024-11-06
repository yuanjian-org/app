import {
    Text,
    Link,
    HStack,
    Icon,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

export default function MarkdownSupport({ prefix }: {
  prefix?: string,
}) {
    return <Link target="_blank" 
      href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax" 
      >
      <HStack>
        <Text>{prefix && prefix}支持 Markdown 格式</Text>
        <Icon as={ExternalLinkIcon} />
      </HStack>
    </Link>;
  }
