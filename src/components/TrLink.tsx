import { TableRowProps, Tr } from "@chakra-ui/react";
import { useRouter } from "next/router";

/**
 * This component is similar to `<LinkBox as={Tr}>...<LinkOverlay />...</LinkBox>`. For some reason the latter doesn't
 * work well on Safari.
 * 
 * To define custom click behavior, use `<TrLink onClick={...}>`.
 * 
 * To define customer click behavior on some but not all colums:
 * 
 *  ```
 *  <TrLink>
 *    <TdLink href="...">...</TdLink>
 *    <Td onClick={...}>...</Td>        // The column with custom behavior
 *    <TdLink href="...">...</TdLink>
 *  </TrLinkd>
 */
export default function TrLink({ href, children, ...rest } : {
  href?: string
} & TableRowProps) {
  const router = useRouter();
  return <Tr {...href && { onClick: () => router.push(href) }} cursor='pointer' _hover={{ bg: "white" }} {...rest}>
    {children}
  </Tr>;
}
