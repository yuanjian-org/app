import { compareDate } from 'shared/strings';
import { trpcNext } from "trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { widePage } from 'AppPage';
import { useMemo } from 'react';
import UserCards from "components/UserCards";
import Loader from 'components/Loader';
export default widePage(() => {
  const { data } = trpcNext.users.listVolunteers.useQuery();
  const sorted = useMemo(() => 
    data?.sort((a, b) => compareDate(b.updatedAt, a.updatedAt)), [data]);

  return <>
    <PageBreadcrumb current="志愿者档案" />
    {!sorted ? <Loader /> :
      <UserCards type="Volunteer" users={sorted} />}
  </>;
}, "志愿者档案");
