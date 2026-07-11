import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import getI18nProps from "components/getI18nProps";
import { features } from "shared/Features";
import ErrorPage from "next/error";
import { OrgList } from "components/orgs/OrgList";

export default widePage(() => {
  if (!features.publicOrgsMentors) return <ErrorPage statusCode={404} />;

  const { data: orgs } = trpcNext.orgs.listPublic.useQuery(undefined, {
    enabled: !!features.publicOrgsMentors,
  });

  if (!orgs) return <Loader />;

  return <OrgList orgs={orgs} isPublic={true} />;
}, "机构列表");
export const getStaticProps = getI18nProps;
