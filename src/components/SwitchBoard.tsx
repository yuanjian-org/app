import { PropsWithChildren } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import invariant from "shared/invariant";
import PageLoader from "components/PageLoader";
import AppPageContainer from "components/AppPageContainer";
import { AppPageType } from "AppPage";
import { isPublicUrl, publicUrlPrefix } from "../publicUrl";
import { loginCallbackUrl, loginUrl } from "shared/loginUrl";

/**
 * Handles routing and layout wrapping for non-static authenticated pages.
 * Moved to a standalone component so _app.tsx can dynamically import it,
 * keeping heavy dashboard components out of initial loads for static pages.
 */
export default function SwitchBoard({
  children,
  pageType,
}: {
  pageType?: AppPageType;
} & PropsWithChildren) {
  const { status } = useSession();
  const router = useRouter();

  // Invariant guaranteed by the caller
  invariant(!isPublicUrl(router.route), "logged-in page");
  const isAuthPage = router.route.startsWith("/auth/");

  if (status == "loading") {
    return <PageLoader />;
  } else if (status == "unauthenticated") {
    if (isAuthPage) {
      return children;
    } else if (router.asPath === "/") {
      // Redirect to public page if accessing home page while logged out.
      void router.push(publicUrlPrefix);
      return null;
    } else {
      // Redirect to login if attempting to access sub-pages while logged out.
      void router.push(loginUrl(router.asPath));
      return null;
    }
  } else {
    invariant(status == "authenticated", "session status");
    if (isAuthPage) {
      // Avoid flashing dashboard page on login by redirecting to callbackUrl.
      const url = loginCallbackUrl(router);
      void router.replace(url);
      return null;
    } else if (router.route === "/oauth2/profile") {
      // /oauth2/profile page does not require <AppPageContainer /> wrapper.
      return children;
    } else {
      return (
        <AppPageContainer pageType={pageType}>{children}</AppPageContainer>
      );
    }
  }
}
