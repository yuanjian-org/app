import { Flex, Box, Link, Tooltip, Text, useClipboard } from "@chakra-ui/react";
import { CopyIcon } from "@chakra-ui/icons";
import { useEffect } from "react";
import { toast } from "react-toastify";
import NextLink from "next/link";
import { displayName } from "shared/Role";
import { notSetText } from "shared/strings/notSetText";
import { SmallGrayText } from "./SmallGrayText";
import T from "components/T";
import { useTranslation } from "next-i18next";

export function ContactFieldRow({
  mask,
  copyable,
  name,
  value,
}: {
  mask: boolean;
  copyable: boolean;
  name: string;
  value: string | null;
}) {
  const { t } = useTranslation("common");
  const { onCopy, hasCopied } = useClipboard(value || "");

  useEffect(() => {
    if (hasCopied) toast.success("内容已经拷贝到剪贴板。");
  }, [hasCopied]);

  return (
    <Flex direction="column">
      <b>
        <T>{name}</T>{" "}
      </b>
      <Box>
        {!copyable && (
          <SmallGrayText>
            <T>请联系</T>
            <Link as={NextLink} href="/who-can-see-my-data">
              {displayName("MentorshipOperator")}
            </Link>
          </SmallGrayText>
        )}
        {copyable && !value && <Text color="gray">{notSetText}</Text>}
        {copyable && value && (
          <>
            {mask ? "••••••••••••" : value}{" "}
            <Tooltip label={t("拷贝内容到剪贴板")}>
              <CopyIcon onClick={onCopy} cursor="pointer" />
            </Tooltip>
          </>
        )}
      </Box>
    </Flex>
  );
}
