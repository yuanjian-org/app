import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from "shared/strings";
import Applicant from 'components/Applicant';
import { InterviewType } from 'shared/InterviewType';
import { widePage } from 'AppPage';

export default widePage(() => {
  const userId = parseQueryStringOrUnknown(useRouter(), 'applicantId');
  const type: InterviewType = useRouter().query.type === "MenteeInterview" ?
    "MenteeInterview" : "MentorInterview";

  return <Applicant userId={userId} type={type} showTitle useNameAsTitle />;
});
