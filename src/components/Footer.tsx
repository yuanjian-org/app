import { whiteLabel } from "shared/WhiteLabel";
import { Link, Wrap, WrapItem, WrapProps } from "@chakra-ui/react";
import { breakpoint } from "theme/breakpoints";
import { componentSpacing, pageMarginX } from "theme/metrics";
import T from "components/T";

export default function Footer({ ...rest }: WrapProps) {
  const color = "gray.400";
  const year = new Date().getFullYear();
  const spacingX = {
    base: componentSpacing,
    [breakpoint]: componentSpacing * 2,
  };
  // Use XHEF's own GongAn Beian and ICP numbers on the xhef deployment.
  const isXhef = whiteLabel === "xhef";
  const beian = isXhef ? "33040202000149" : "33010802014263";
  const beianUrl = `https://beian.mps.gov.cn/#/query/webSearch?code=${beian}`;
  const isSongding = whiteLabel === "yqd" || whiteLabel === "sylp";
  const icp = isSongding
    ? "沪ICP备2021004288号"
    : isXhef
      ? "浙ICP备09080143号-1"
      : "浙ICP备2024117465号-4";

  return (
    <Wrap
      justify="center"
      textAlign="center"
      fontSize="xs"
      color={color}
      spacingX={spacingX}
      mt="80px"
      mb="30px"
      mx={pageMarginX}
      {...rest}
    >
      {!isSongding && (
        <WrapItem minW={0}>
          <Wrap justify="center" minW={0} spacingX={spacingX}>
            <WrapItem>
              &copy; {year} <T>杭州思烛教育科技有限公司</T>
            </WrapItem>
            {isXhef && (
              <WrapItem>
                &copy; {year} <T>新华爱心教育基金会</T>
              </WrapItem>
            )}
          </Wrap>
        </WrapItem>
      )}

      <WrapItem minW={0}>
        <Wrap justify="center" minW={0} spacingX={spacingX}>
          {!isSongding && (
            <WrapItem>
              <Link color={color} isExternal href={beianUrl} rel="noreferrer">
                {/* @i18n-ignore */}
                浙公网安备
                {beian}
              </Link>
            </WrapItem>
          )}

          <WrapItem>
            <Link color={color} isExternal href="http://beian.miit.gov.cn/">
              {/* @i18n-ignore */}
              {icp}
            </Link>
          </WrapItem>
        </Wrap>
      </WrapItem>
    </Wrap>
  );
}
