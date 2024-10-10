import { Flex, Link, List, ListItem, Text } from '@chakra-ui/react';

export const footerMarginTop = "80px";
export const footerBreakpoint = "lg";
const color = 'gray.400';

export default function Footer() {
  const FooterItem = (props: any) => <ListItem marginX={4}>{props.children}</ListItem>;

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
        fontWeight='500'
        textAlign={{
          base: 'center',
          [footerBreakpoint]: 'start'
        }}
        paddingBottom={{ base: '20px', [footerBreakpoint]: '0px' }}
      >
        &copy; {new Date().getFullYear()} 远见教育基金会
      </Text>
      <List display='flex'>
        <FooterItem>
          <Link fontWeight='500' color={color} isExternal href='http://yuanjian.org/blog'>
            博客
          </Link>
        </FooterItem>
        <FooterItem>
          <Link fontWeight='500' color={color} isExternal href='http://app.yuanjian.org'>
            资源库
          </Link>
        </FooterItem>
        <FooterItem>
          <Link fontWeight='500' color={color} isExternal href='https://github.com/yuanjian-org/app/issues/new'>
            报告问题
          </Link>
        </FooterItem>
      </List>
    </Flex>
  );
}

export function LoginFooter() {
  return (
    <Link
      fontWeight='500'
      color={color}
      isExternal
      href='http://beian.miit.gov.cn/'
      paddingBottom="20px"
    >
      浙ICP备2024117465号-2
    </Link>
  );
}
