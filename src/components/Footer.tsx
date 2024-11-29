import { HStack, Link, Wrap, WrapItem, WrapProps } from '@chakra-ui/react';
import Image from "next/image";
import beian from '../../public/img/beian.png';
import { componentSpacing } from 'theme/metrics';
import { pageMarginX } from 'theme/metrics';

export default function Footer({ ...rest } : WrapProps) {
  const color = 'gray.400';

  return <Wrap
    justify='center'
    fontSize="xs"
    color={color}
    spacingX={componentSpacing * 2}
    mt="80px"
    mb="30px"
    mx={pageMarginX}
    {...rest}
  >
    <WrapItem>
      &copy; {new Date().getFullYear()} 杭州思烛教育科技有限公司
    </WrapItem>
    <WrapItem>
      <HStack>
        <Image
          alt="备案"
          width={13}
          // Fix browser warning
          style={{ height: "auto" }}
          src={beian}
        />
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
