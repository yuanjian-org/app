/*eslint-disable*/

import { Center, Flex, Link, List, ListItem, Text } from '@chakra-ui/react';
import vercelBanner from '../../public/img/vercel-banner.svg';
import Image from "next/image";

export const footerMarginTop = "80px";
export const footerBreakpoint = "lg";

export default function Footer() {
  const color = 'gray.400';
  const FooterItem = (props: any) =>
    <ListItem marginEnd={{
      base: '20px',
      md: '44px'
    }}>{props.children}</ListItem>;

  return (
    <Flex
      zIndex='3'
      flexDirection={{
        base: 'column',
        [footerBreakpoint]: 'row'
      }}
      alignItems={{
        base: 'center',
        [footerBreakpoint]: 'start'
      }}
      justifyContent='space-between'
      paddingX="30px"
      paddingBottom='30px'
      paddingTop={footerMarginTop}
    >
      <Text
        color={color}
        textAlign={{
          base: 'center',
          [footerBreakpoint]: 'start'
        }}
        paddingBottom={{ base: '20px', [footerBreakpoint]: '0px' }}>
        {' '}
        <Text as='span' fontWeight='500' marginStart='4px'>
          &copy; {new Date().getFullYear()} 远见教育基金会
        </Text>
      </Text>
      <List display='flex'>
        <FooterItem>
          <Link fontWeight='500' color={color} isExternal href='mailto:hi@yuanjian.org'>
            联系我们
          </Link>
        </FooterItem>
        <FooterItem>
          <Link fontWeight='500' color={color} isExternal href='http://app.yuanjian.org'>
            资源库
          </Link>
        </FooterItem>
        <FooterItem>
          <Link fontWeight='500' color={color} isExternal href='http://yuanjian.org/blog'>
            博客
          </Link>
        </FooterItem>
        <Center opacity='50%'>
          <ListItem>
              <Link isExternal href="https://vercel.com/?utm_source=yuanjian&utm_campaign=oss">
                <Image src={vercelBanner} alt="Vercel Banner" height="22" />
              </Link>
          </ListItem>
        </Center>
      </List>
    </Flex>
  );
}
