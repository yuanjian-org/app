import { Text, Link, HStack, Icon, LinkProps } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export const markdownSyntaxUrl = "https://markdown.com.cn/basic-syntax";

export default function MarkdownSupport({
  prefix,
  ...rest
}: {
  prefix?: string;
} & LinkProps) {
  return (
    <Link target="_blank" href={markdownSyntaxUrl} {...rest}>
      <HStack>
        <Text>{prefix && prefix}支持 Markdown</Text>
        <Icon as={ExternalLinkIcon} />
      </HStack>
    </Link>
  );
}
