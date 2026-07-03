import { whiteLabel } from "shared/WhiteLabel";
import Image from "next/image";
import NextLink from "next/link";
import { staticUrlPrefix } from "static";

export function getLogoSource(whiteLabel: string) {
  if (whiteLabel === "yqd") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../../public/img/logo.yqd.png").default;
  }
  if (whiteLabel === "sylp") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../../public/img/logo.sylp.png").default;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../../public/img/logo.yuantu.png").default;
}

export default function DynamicLogo({ height = 30 }: { height?: number }) {
  const src = getLogoSource(whiteLabel);

  return (
    <NextLink href={staticUrlPrefix}>
      <Image src={src} alt="Logo" height={height} priority />
    </NextLink>
  );
}
