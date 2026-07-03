import { whiteLabel } from "shared/WhiteLabel";
import NextLink from "next/link";
import { staticUrlPrefix } from "static";
import dynamic from "next/dynamic";
import { Skeleton } from "@chakra-ui/react";
import Image from "next/image";

const LogoYqd = dynamic(
  () =>
    import("../../public/img/logo.yqd.png").then((mod) => {
      const ImgYqd = (props: any) => (
        <Image src={mod.default} alt="Logo" {...props} />
      );
      ImgYqd.displayName = "LogoYqd";
      return ImgYqd;
    }),
  {
    ssr: true,
    loading: () => <Skeleton height="30px" width="100px" />,
  },
);

const LogoSylp = dynamic(
  () =>
    import("../../public/img/logo.sylp.png").then((mod) => {
      const ImgSylp = (props: any) => (
        <Image src={mod.default} alt="Logo" {...props} />
      );
      ImgSylp.displayName = "LogoSylp";
      return ImgSylp;
    }),
  {
    ssr: true,
    loading: () => <Skeleton height="30px" width="100px" />,
  },
);

const LogoYuantu = dynamic(
  () =>
    import("../../public/img/logo.yuantu.png").then((mod) => {
      const ImgYuantu = (props: any) => (
        <Image src={mod.default} alt="Logo" {...props} />
      );
      ImgYuantu.displayName = "LogoYuantu";
      return ImgYuantu;
    }),
  {
    ssr: true,
    loading: () => <Skeleton height="30px" width="100px" />,
  },
);

export default function DynamicLogo({ height = 30 }: { height?: number }) {
  let LogoComponent = LogoYuantu;
  if (whiteLabel === "yqd") LogoComponent = LogoYqd;
  if (whiteLabel === "sylp") LogoComponent = LogoSylp;

  return (
    <NextLink href={staticUrlPrefix}>
      <LogoComponent height={height} priority />
    </NextLink>
  );
}
