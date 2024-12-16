import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import Applicant from 'components/Applicant';
import { InterviewType } from 'shared/InterviewType';
import { widePage } from 'AppPage';
import Loader from 'components/Loader';

export default widePage(() => {
  const userId = parseQueryString(useRouter(), 'applicantId');
  const type: InterviewType = useRouter().query.type === "MenteeInterview" ?
    "MenteeInterview" : "MentorInterview";

  return userId ?
    <Applicant userId={userId} type={type} showTitle useNameAsTitle /> :
    <Loader />;
});
