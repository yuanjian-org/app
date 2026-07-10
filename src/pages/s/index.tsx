import XLandingPage from "components/XLandingPage";
import YuantuLandingPage from "components/YuantuLandingPage";
import getI18nProps from "components/getI18nProps";

export default function Page() {
  // Directly inspect env var so Webpack's DefinePlugin can replace it with a
  // string literal at build time, allowing dead code elimination (DCE) to prune
  // unused landing page imports.
  if (process.env.NEXT_PUBLIC_ENABLE_PROJECTS === "true") {
    return <XLandingPage />;
  } else {
    return <YuantuLandingPage />;
  }
}

Page.title = "首页";
export const getStaticProps = getI18nProps;
