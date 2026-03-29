import { useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useMe from "../../useMe";
import PageLoader from "../../components/PageLoader";
import AppPageContainer from "../../components/AppPageContainer";
import AppPage from "../../AppPage";
import Head from "next/head";

const SetProfilePage: AppPage = () => {
  const router = useRouter();
  const { status } = useSession();
  const me = useMe();

  useEffect(() => {
    if (status === "unauthenticated") {
      void router.push("/auth/login");
    } else if (status === "authenticated" && me?.phone) {
      // Once phone is set, redirect back to the authorize endpoint to continue
      const callbackUrl = router.query.callbackUrl as string;
      const safeUrl = callbackUrl?.startsWith("/") ? callbackUrl : "/";
      void router.push(safeUrl);
    }
  }, [status, me, router]);

  return (
    <>
      <Head>
        <title>设置个人信息</title>
      </Head>
      <AppPageContainer pageType="bare">
        <PageLoader loadingText="请先设置手机号..." />
      </AppPageContainer>
    </>
  );
};

SetProfilePage.title = "设置个人信息";

export default SetProfilePage;
