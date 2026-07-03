import Image from "next/image";
import { getWhiteLabel } from "shared/getWhiteLabel";
import yuantuLogo from "../../public/img/logo.yuantu.png";
import yqdLogo from "../../public/img/logo.yqd.png";
import sylpLogo from "../../public/img/logo.sylp.png";
import NextLink from "next/link";
import { staticUrlPrefix } from "static";

export function getLogoSource(whiteLabel: string) {
  if (whiteLabel === "yqd") return yqdLogo;
  if (whiteLabel === "sylp") return sylpLogo;
  return yuantuLogo;
}

export default function DynamicLogo({ height = 30 }: { height?: number }) {
  const whiteLabel = getWhiteLabel();
  const src = getLogoSource(whiteLabel);

  return (
    <NextLink href={staticUrlPrefix}>
      <Image src={src} alt="Logo" height={height} />
    </NextLink>
  );
}
