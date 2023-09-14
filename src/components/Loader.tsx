import { Button, ButtonProps } from "@chakra-ui/react";

export default function Loader({ loadingText, ...rest }: {
  loadingText?: string,
} & ButtonProps) {
  return <Button isLoading={true} loadingText={loadingText ? loadingText : '加载中...'} 
    disabled variant="ghost" {...rest} />;
}
