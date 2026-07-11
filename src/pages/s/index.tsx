import DemoLandingPage from "components/DemoLandingPage";
import getI18nProps from "components/getI18nProps";
import SylpLandingPage from "components/SylpLandingPage";
import UstcLandingPage from "components/UstcLandingPage";
import XhefLandingPage from "components/XhefLandingPage";
import XLandingPage from "components/XLandingPage";
import YqdLandingPage from "components/YqdLandingPage";
import YuantuLandingPage from "components/YuantuLandingPage";

export default function Page() {
  // Directly use env var to allow tree shaking
  switch (process.env.NEXT_PUBLIC_WHITE_LABEL) {
    case "demo":
      return <DemoLandingPage />;
    case "x":
      return <XLandingPage />;
    case "sylp":
      return <SylpLandingPage />;
    case "yqd":
      return <YqdLandingPage />;
    case "ustc":
      return <UstcLandingPage />;
    case "xhef":
      return <XhefLandingPage />;
    default:
      return <YuantuLandingPage />;
  }
}

Page.title = "首页";

export const getStaticProps = async ({ locale }: { locale: string }) =>
  await getI18nProps({
    locale,
    namespaces: [
      "common",
      ...(process.env.NEXT_PUBLIC_WHITE_LABEL === "sylp" ? ["sylp"] : []),
      ...(process.env.NEXT_PUBLIC_WHITE_LABEL === "yqd" ? ["yqd"] : []),
    ],
  });
