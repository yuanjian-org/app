import DemoLandingPage from "components/DemoLandingPage";
import getI18nProps from "components/getI18nProps";
import XLandingPage from "components/XLandingPage";
import YuantuLandingPage from "components/YuantuLandingPage";

export default function Page() {
  // Directly inspect env var so Webpack's DefinePlugin can replace it with a
  // string literal at build time, allowing dead code elimination (DCE) to prune
  // unused landing page imports.
  if (process.env.NEXT_PUBLIC_ENABLE_PROJECTS === "true") {
    return process.env.NEXT_PUBLIC_WHITE_LABEL === "demo" ? (
      <DemoLandingPage />
    ) : (
      <XLandingPage />
    );
  } else {
    return <YuantuLandingPage />;
  }
}

Page.title = "首页";

export const getStaticProps = async ({ locale }: { locale: string }) =>
  await getI18nProps({ locale, namespaces: ["common", "sylp", "yqd"] });
