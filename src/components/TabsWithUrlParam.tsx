import React from 'react';
import { Tabs, TabsProps } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import _ from "lodash";

/**
 * <Tabs> that synchronizes tab index with the URL param `tab`.
 */
export default function TabsWithUrlParam({ children, ...rest }: TabsProps) {
  const router = useRouter();
  const index = parseInt(typeof router.query.tab == "string" ? router.query.tab : "0");

  return <Tabs defaultIndex={index} {...rest} onChange={index => {
    const query = structuredClone(router.query);
    query.tab = `${index}`;
    router.replace({ pathname: router.pathname, query });
  }}>
    {children}
  </Tabs>;
}
