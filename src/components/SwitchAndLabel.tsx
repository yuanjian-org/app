import { HStack, Switch, Text } from "@chakra-ui/react";

export default function SwitchAndLabel({
  isChecked,
  onChange,
  isDisabled,
}: {
  isChecked: boolean;
  onChange: (checked: boolean) => void;
  isDisabled?: boolean;
}) {
  return (
    <HStack>
      <Switch
        isDisabled={isDisabled}
        isChecked={isChecked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Text>{isChecked ? "开启" : "关闭"}</Text>
    </HStack>
  );
}
