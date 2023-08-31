import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from 'parseQueryString';
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import _ from "lodash";
import PageBreadcrumb from 'components/PageBreadcrumb';
import Calibration from 'components/Calibration';

const Page: NextPageWithLayout = () => {
  const calibrationId = parseQueryStringOrUnknown(useRouter(), 'calibrationId');
  const { data: calibration } = trpcNext.calibrations.get.useQuery(calibrationId);

  return !calibration ? <Loader /> : <>
    <PageBreadcrumb current={`面试讨论：${calibration.name}`} />
    <Calibration calibration={calibration} />
  </>;
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
