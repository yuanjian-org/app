import { Button } from "@chakra-ui/react";

export default function Loader() {
  return <Button isLoading={true} loadingText={'加载中...'} disabled />;
}
