import { Link, Wrap, WrapItem, WrapProps } from "@chakra-ui/react";
import { componentSpacing } from "theme/metrics";
import { pageMarginX } from "theme/metrics";

export default function Footer({
  icpIndex = 4,
  beianNo = "33010802014263",
  ...rest
}: {
  icpIndex?: number;
  beianNo?: string;
} & WrapProps) {
  const color = "gray.400";

  return (
    <Wrap
      justify="center"
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
        <Link
          color={color}
          isExternal
          href={`https://beian.mps.gov.cn/#/query/webSearch?code=${beianNo}`}
          rel="noreferrer"
        >
          浙公网安备{beianNo}
        </Link>
      </WrapItem>
      <WrapItem>
        <Link color={color} isExternal href="http://beian.miit.gov.cn/">
          浙ICP备2024117465号-{icpIndex}
        </Link>
      </WrapItem>
    </Wrap>
  );
}
