import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings";
import { trpcNext } from "trpc";
import Loader from "components/Loader";
import PageBreadcrumb from "components/PageBreadcrumb";
import Calibration from "components/Calibration";
import { widePage } from "AppPage";

export default widePage(() => {
  const calibrationId = parseQueryString(useRouter(), "calibrationId");
  const { data: calibration } = trpcNext.calibrations.get.useQuery(
    calibrationId ?? "",
    { enabled: !!calibrationId },
  );

  return !calibration ? (
    <Loader />
  ) : (
    <>
      <PageBreadcrumb current={`面试讨论：${calibration.name}`} />
      <Calibration calibration={calibration} />
    </>
  );
}, "面试讨论组");
