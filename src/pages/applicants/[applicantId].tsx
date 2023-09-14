import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from 'parseQueryString';
import MenteeApplicant from 'components/MenteeApplicant';
import { InterviewType } from 'shared/InterviewType';
import { widePage } from 'AppPage';

export default widePage(() => {
  const userId = parseQueryStringOrUnknown(useRouter(), 'applicantId');
  const type: InterviewType = useRouter().query.type === "mentee" ? "MenteeInterview" : "MentorInterview";

  if (type !== "MenteeInterview") alert("Mentor application page is not implemented.");

  return <MenteeApplicant userId={userId} showTitle useNameAsTitle showContact readonly={false} />;
});
