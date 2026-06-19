import { Link, Wrap, WrapItem, WrapProps } from "@chakra-ui/react";
import { componentSpacing } from "theme/metrics";
import { pageMarginX } from "theme/metrics";
import { useIsStaticConfigsReady, useWhiteLabel } from "./useStaticConfigs";

export default function Footer({ ...rest }: WrapProps) {
  const color = "gray.400";
  const beian = "33010802014263";
  const isReady = useIsStaticConfigsReady();
  const whiteLabel = useWhiteLabel();

  const isSongding = whiteLabel === "yqd" || whiteLabel === "sylp";
  const icp = isSongding ? "沪ICP备2021004288号" : "浙ICP备2024117465号-4";

  if (!isReady) return null;

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
      {!isSongding && (
        <WrapItem>
          &copy; {new Date().getFullYear()} 杭州思烛教育科技有限公司
        </WrapItem>
      )}

      {!isSongding && (
        <WrapItem>
          <Link
            color={color}
            isExternal
            href={`https://beian.mps.gov.cn/#/query/webSearch?code=${beian}`}
            rel="noreferrer"
          >
            浙公网安备{beian}
          </Link>
        </WrapItem>
      )}

      <WrapItem>
        <Link color={color} isExternal href="http://beian.miit.gov.cn/">
          {icp}
        </Link>
      </WrapItem>
    </Wrap>
  );
}
