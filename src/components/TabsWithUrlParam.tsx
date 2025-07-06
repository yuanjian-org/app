import { Tabs, TabsProps } from "@chakra-ui/react";
import { useRouter } from "next/router";
import replaceUrlParam from "shared/replaceUrlParam";

/**
 * <Tabs> that synchronizes tab index with the URL param `tab`.
 */
export default function TabsWithUrlParam({ children, ...rest }: TabsProps) {
  const router = useRouter();
  const index = parseInt(
    typeof router.query.tab == "string" ? router.query.tab : "0",
  );

  return (
    <Tabs
      defaultIndex={index}
      onChange={(idx) => replaceUrlParam(router, "tab", `${idx}`)}
      {...rest}
    >
      {children}
    </Tabs>
  );
}
