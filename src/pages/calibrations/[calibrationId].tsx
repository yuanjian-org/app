import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from "shared/strings";
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import PageBreadcrumb from 'components/PageBreadcrumb';
import Calibration from 'components/Calibration';

export default function Page() {
  const calibrationId = parseQueryStringOrUnknown(useRouter(), 'calibrationId');
  const { data: calibration } = trpcNext.calibrations.get.useQuery(calibrationId);

  return !calibration ? <Loader /> : <>
    <PageBreadcrumb current={`面试讨论：${calibration.name}`} />
    <Calibration calibration={calibration} />
  </>;
};
