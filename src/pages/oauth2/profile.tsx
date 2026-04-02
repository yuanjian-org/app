import { useEffect } from "react";
import { useRouter } from "next/router";
import useMe from "useMe";
import PageLoader from "components/PageLoader";
import { parseQueryString } from "shared/strings";
import { getSafeCallbackUrl, profileCallbackUrlKey } from "shared/callbackUrl";
import { SetPhoneModal } from "components/PostLoginModels";
import { signOut } from "components/signOut";

export default function Page() {
  const me = useMe();
  const router = useRouter();

  // Get the callback URL, defaulting to the root if not provided.
  const url = parseQueryString(router, profileCallbackUrlKey);
  const callbackUrl = getSafeCallbackUrl(url);

  useEffect(() => {
    // Check if the user's phone is set.
    // If it is, redirect to the callback URL.
    if (me?.phone) {
      void router.replace(callbackUrl);
    }
  }, [me?.phone, callbackUrl, router]);

  if (!me?.phone) {
    return <SetPhoneModal cancel={signOut} cancelLabel="退出登录" />;
  } else {
    return <PageLoader loadingText="完成登录..." />;
  }
}
