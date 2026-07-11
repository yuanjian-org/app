import {
  Editable,
  EditablePreview,
  EditableInput,
  useEditableControls,
  IconButton,
  EditableProps,
  EditableTextarea,
  ButtonGroup,
  Link,
  Tooltip,
} from "@chakra-ui/react";
import React, { useState } from "react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { MdEdit } from "react-icons/md";
import { linkBaseColor } from "theme/links";
import { useTranslation } from "next-i18next/pages";

export default function EditableWithIconOrLink({
  editor,
  decorator,
  defaultValue,
  onSubmit,
  ...rest
}: {
  editor: "input" | "textarea";
  decorator: "icon" | "link";
} & EditableProps) {
  const { t } = useTranslation("common");
  // Use a state variable to reflect latest content
  const [value, setValue] = useState(defaultValue);

  const onSubmitWrapper = (newValue: string) => {
    setValue(newValue);
    if (onSubmit) onSubmit(newValue);
  };

  // Show the edit icon when not in editing mode. See
  // https://chakra-ui.com/docs/components/editable#with-custom-input-and-controls
  const EditableControls = () => {
    const {
      isEditing,
      getEditButtonProps,
      getSubmitButtonProps,
      getCancelButtonProps,
    } = useEditableControls();
    return isEditing ? (
      <ButtonGroup size="sm">
        <Tooltip label={t("确认")}>
          <IconButton
            aria-label="确认"
            icon={<CheckIcon />}
            {...getSubmitButtonProps()}
            variant="unstyled"
          />
        </Tooltip>
        <Tooltip label={t("取消")}>
          <IconButton
            aria-label="取消"
            icon={<CloseIcon />}
            {...getCancelButtonProps()}
            variant="unstyled"
          />
        </Tooltip>
      </ButtonGroup>
    ) : // If defaultValue is empty or null or undefined, show the icon button
    // even if the decorator is not icon so that the user can click on the
    // empty text to edit.
    decorator == "icon" || !value ? (
      <Tooltip label={t("编辑")}>
        <IconButton
          aria-label="编辑"
          {...getEditButtonProps()}
          variant="unstyled"
          marginStart={2}
          icon={
            <MdEdit
              {...(decorator == "link" ? { color: linkBaseColor } : {})}
            />
          }
        />
      </Tooltip>
    ) : (
      <></>
    );
  };

  return (
    <Editable defaultValue={defaultValue} onSubmit={onSubmitWrapper} {...rest}>
      {decorator == "icon" ? (
        <EditablePreview style={{ whiteSpace: "pre-wrap" }} />
      ) : (
        <Link>
          <EditablePreview
            cursor="pointer"
            style={{ whiteSpace: "pre-wrap" }}
          />
        </Link>
      )}

      {editor == "input" ? <EditableInput /> : <EditableTextarea />}

      <EditableControls />
    </Editable>
  );
}
