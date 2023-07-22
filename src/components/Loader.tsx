import { Button } from "@chakra-ui/react";

export default function Loader(props: {
  loadingText?: string,
}) {
  return <Button isLoading={true} loadingText={props.loadingText ? props.loadingText : '加载中...'} disabled variant="ghost" />;
}
