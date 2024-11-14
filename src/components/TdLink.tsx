import { TableCellProps, Td } from "@chakra-ui/react";
import { useRouter } from "next/router";

/**
 * This component is similar to `<LinkBox as={Td}>...<LinkOverlay />...</LinkBox>`.
 * For some reason the latter doesn't * work well on Safari.
 * 
 * To define custom behavior, use `<TdLink href="#" onClick={...}>`.
 */
export default function TdLink({ href, children, ...rest } : {
  href: string
} & TableCellProps) {
  const router = useRouter();
  return <Td onClick={() => router.push(href)} cursor='pointer' {...rest}>
    {children}
  </Td>;
}
