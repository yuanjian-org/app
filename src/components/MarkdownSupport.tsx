import { ExternalLink } from "./ExternalLink";
import { Text, HStack, Icon, LinkProps } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";

export const markdownSyntaxUrl = "https://markdown.com.cn/basic-syntax";

export default function MarkdownSupport({
  prefix,
  ...rest
}: {
  prefix?: string;
} & LinkProps) {
  return (
    <ExternalLink href={markdownSyntaxUrl} {...rest}>
      <HStack>
        <Text>{prefix && prefix}支持 Markdown</Text>
        <Icon as={ExternalLinkIcon} />
      </HStack>
    </ExternalLink>
  );
}
