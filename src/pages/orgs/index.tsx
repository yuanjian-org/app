import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import getI18nProps from "components/getI18nProps";
import { OrgList } from "components/orgs/OrgList";
import PageLoader from "components/PageLoader";

export default widePage(() => {
  const { data: orgs } = trpcNext.orgs.list.useQuery();

  if (!orgs) return <PageLoader />;

  return <OrgList orgs={orgs} isPublic={false} />;
}, "机构列表");

export const getStaticProps = getI18nProps;
