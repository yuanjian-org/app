import getI18nProps from "components/getI18nProps";
import { GetServerSideProps } from "next";
import { trpcNext } from "../trpc";
import { parseQueryString } from "shared/strings/parseQueryString";
import { useRouter } from "next/router";
import { UserPage } from "./users/[userId]";

export default function Page() {
  const userUrl = parseQueryString(useRouter(), "userUrl");
  const { data } = trpcNext.users.getUserProfile.useQuery(
    { userUrl },
    {
      enabled: !!userUrl,
    },
  );
  return <UserPage profile={data} />;
}
Page.title = "用户资料";

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const i18nProps = await getI18nProps({ locale: locale ?? "zh" });
  return { props: { ...i18nProps.props } };
};
