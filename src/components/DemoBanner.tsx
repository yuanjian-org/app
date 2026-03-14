import { Alert, AlertIcon } from "@chakra-ui/react";

export default function DemoBanner({ isDemo }: { isDemo?: boolean }) {
  if (!isDemo) {
    return null;
  }

  return (
    <Alert
      status="info"
      variant="solid"
      justifyContent="center"
      fontSize="sm"
      py={1}
    >
      <AlertIcon />
      演示模式。数据每天重置一次。
    </Alert>
  );
}
