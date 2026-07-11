import { EditIcon } from "@chakra-ui/icons";
import { IconButton, Tooltip } from "@chakra-ui/react";
import { useTranslation } from "next-i18next/pages";

export default function EditIconButton({ onClick }: { onClick?: () => void }) {
  const { t } = useTranslation("common");
  return (
    <Tooltip label={t("编辑")}>
      <IconButton
        icon={<EditIcon />}
        variant="ghost"
        aria-label="编辑"
        {...(onClick && { onClick: () => onClick() })}
      />
    </Tooltip>
  );
}
