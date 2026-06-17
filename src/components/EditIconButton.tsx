import { EditIcon } from "@chakra-ui/icons";
import { IconButton, Tooltip } from "@chakra-ui/react";

export default function EditIconButton({ onClick }: { onClick?: () => void }) {
  return (
    <Tooltip label="编辑">
      <IconButton
        icon={<EditIcon />}
        variant="ghost"
        aria-label="编辑"
        {...(onClick && { onClick: () => onClick() })}
      />
    </Tooltip>
  );
}
