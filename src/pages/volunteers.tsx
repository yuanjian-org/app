import { compareDate } from 'shared/strings';
import { trpcNext } from "trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { useMemo } from 'react';
import UserCards from "components/UserCards";

export default widePage(() => {
  const { data } = trpcNext.users.listVolunteerProfiles.useQuery();
  const sorted = useMemo(() => 
    data?.sort((a, b) => compareDate(b.updatedAt, a.updatedAt)), [data]);

  return <>
    <PageBreadcrumb current="志愿者档案" />
    <UserCards type="Volunteer" users={sorted} />
  </>;
}, "志愿者档案");
