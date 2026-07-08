import { Text, Link, HStack, Icon, LinkProps } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import T from "components/T";

export const markdownSyntaxUrl = "https://markdown.com.cn/basic-syntax";

export default function MarkdownSupport({
  prefix,
  ...rest
}: {
  prefix?: string;
} & LinkProps) {
  return (
    <Link isExternal href={markdownSyntaxUrl} {...rest}>
      <HStack>
        <Text>
          {prefix && prefix}
          <T>支持 Markdown</T>
        </Text>
        <Icon as={ExternalLinkIcon} />
      </HStack>
    </Link>
  );
}
