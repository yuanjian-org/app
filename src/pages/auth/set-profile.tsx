import { useEffect } from "react";
import { useRouter } from "next/router";
import useMe from "useMe";
import PageLoader from "components/PageLoader";
import { parseQueryString } from "shared/strings";

export default function SetProfile() {
  const me = useMe();
  const router = useRouter();

  // Get the callback URL, defaulting to the root if not provided.
  const callbackUrl = parseQueryString(router, "callbackUrl") ?? "/";

  useEffect(() => {
    // Check if the user's phone is set.
    // If it is, redirect to the callback URL.
    // /oauth2/authorize explicitly redirects here regardless of whether
    // the phone is set, so that the user receives <SetPhoneModal />
    // on this clean page, rather than on the regular dashboard
    // which might contain content the user shouldn't interact with.
    if (me.phone) {
      void router.replace(callbackUrl);
    }
  }, [me.phone, callbackUrl, router]);

  // If phone is not set, <PostLoginModels /> will be rendered globally
  // by <AppPageContainer /> and will show the <SetPhoneModal /> automatically.
  return <PageLoader loadingText="完成登录..." />;
}
