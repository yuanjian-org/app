import { TableRowProps, Tr } from "@chakra-ui/react";
import { useRouter } from "next/router";

/**
 * This component is similar to `<LinkBox as={Tr}>...<LinkOverlay />...</LinkBox>`. For some reason the latter doesn't
 * work well on Safari.
 * 
 * To define custom behavior, use `<TrLink href="#" onClick={...}>`.
 */
export default function TrLink({ href, children, ...rest } : {
  href: string
} & TableRowProps) {
  const router = useRouter();
  return <Tr onClick={() => router.push(href)} cursor='pointer' _hover={{ bg: "white" }} {...rest}>
    {children}
  </Tr>;
}
