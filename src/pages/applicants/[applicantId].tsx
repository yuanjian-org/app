import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import MenteeApplicant from 'components/MenteeApplicant';
import { InterviewType } from 'shared/InterviewType';

const Page: NextPageWithLayout = () => {
  const userId = parseQueryParameter(useRouter(), 'applicantId');
  const type: InterviewType = useRouter().query.type === "mentee" ? "MenteeInterview" : "MentorInterview";

  if (type !== "MenteeInterview") alert("Mentor application page is not implemented.");

  return <MenteeApplicant userId={userId} showTitle useNameAsTitle showContact readonly={false} />;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;
