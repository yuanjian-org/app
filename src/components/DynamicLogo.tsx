import { whiteLabel } from "shared/WhiteLabel";
import Image from "next/image";
import yuantuLogo from "../../public/img/logo.yuantu.png";
import yqdLogo from "../../public/img/logo.yqd.png";
import sylpLogo from "../../public/img/logo.sylp.png";
import NextLink from "next/link";
import { staticUrlPrefix } from "static";
import { Box } from "@chakra-ui/react";

export function getLogoSource(whiteLabel: string) {
  if (whiteLabel === "yqd") return yqdLogo;
  if (whiteLabel === "sylp") return sylpLogo;
  return yuantuLogo;
}

export default function DynamicLogo({ height = 30 }: { height?: number }) {
  const src = getLogoSource(whiteLabel);

  return (
    <NextLink href={staticUrlPrefix}>
      {whiteLabel === "sylp" ? (
        // Crop the long SYLP logo on mobile to save space
        <Box
          width={{
            base: whiteLabel === "sylp" ? `${height * 3.2}px` : "auto",
            md: "auto",
          }}
          overflow="hidden"
          height={height}
          display="flex"
        >
          <Image
            src={src}
            alt="Logo"
            height={height}
            priority
            style={{ maxWidth: "none", width: "auto", height: "100%" }}
          />
        </Box>
      ) : (
        <Image src={src} alt="Logo" height={height} priority />
      )}
    </NextLink>
  );
}
