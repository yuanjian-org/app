import { EditIcon } from "@chakra-ui/icons";
import { IconButton } from "@chakra-ui/react";

export default function EditIconButton({ onClick }: {
  onClick?: () => void,
}) {
  return <IconButton icon={<EditIcon />} variant="ghost" aria-label="编辑"
    {...onClick && { onClick: () => onClick() }} />;
}
