import { Flex, HStack, Link, Text, Wrap, WrapItem } from '@chakra-ui/react';
import Image from "next/image";
import beian from '../../public/img/beian.png';

export const footerMarginTop = "80px";
export const footerBreakpoint = "lg";
const color = 'gray.400';
const paddingX = '30px';

export default function Footer() {
  // const FooterItem = (props: any) => <ListItem marginX={4}>{props.children}</ListItem>;

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
      paddingX={paddingX}
      paddingBottom='30px'
      paddingTop={footerMarginTop}
    >
      <Text
        color={color}
        fontSize="sm"
        textAlign={{
          base: 'center',
          [footerBreakpoint]: 'start'
        }}
        paddingBottom={{ base: '20px', [footerBreakpoint]: '0px' }}
      >
        &copy; {new Date().getFullYear()} 杭州思烛教育科技有限公司
      </Text>
      {/* <List display='flex'>
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
      </List> */}
    </Flex>
  );
}

export function LoginFooter() {
  return <Wrap justify='center' fontSize="sm" paddingBottom="30px"
    paddingX={paddingX}>
    <WrapItem>
      <HStack>
        <Image alt="备案" width={15} src={beian} />
        <Link
          color={color}
          isExternal
          href="https://beian.mps.gov.cn/#/query/webSearch?code=33010802013665"
          rel="noreferrer"
        >
          浙公网安备33010802013665
        </Link>
      </HStack>
    </WrapItem>
    <WrapItem>
      <Link
        color={color}
        isExternal
        href='http://beian.miit.gov.cn/'
      >
        浙ICP备2024117465号-2
      </Link>
    </WrapItem>
  </Wrap>;
}
