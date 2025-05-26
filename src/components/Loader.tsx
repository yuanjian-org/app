import { Button, ButtonProps } from "@chakra-ui/react";

export default function Loader({ loadingText = "加载中...", ...rest }: {
  loadingText?: string,
} & ButtonProps) {
  return <Button
    isLoading={true}
    loadingText={loadingText}
    disabled
    variant="ghost"
    {...rest}
  />;
}
