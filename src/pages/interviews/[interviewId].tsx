import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings/parseQueryString";
import { widePage } from "AppPage";
import Interview from "components/Interview";
import Loader from "components/Loader";

export default widePage(() => {
  const interviewId = parseQueryString(useRouter(), "interviewId");

  return interviewId ? (
    <Interview interviewId={interviewId} hasTitle />
  ) : (
    <Loader />
  );
});

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
