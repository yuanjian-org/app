import { Button, ButtonProps } from "@chakra-ui/react";

export const defaultLoadingText = "加载中...";

export default function Loader({ loadingText = defaultLoadingText, ...rest }: {
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
