import React, { useCallback, useState } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../AppLayout";
import { trpcNext } from "../../../../trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import { parseQueryParameter } from '../../../../parseQueryParamter';
import Assessment from 'shared/Assessment';
import Loader from 'components/Loader';
import MarkdownEditor from 'components/MarkdownEditor';

const Page: NextPageWithLayout = () => <AssessmentEditor />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function AssessmentEditor() {
  const router = useRouter();
  const id = parseQueryParameter(router, "assessmentId");
  const partnershipId = parseQueryParameter(router, "partnershipId");
  const { data: assessment } = trpcNext.assessments.get.useQuery<Assessment>({ id });
  const [summary, setSummary] = useState(assessment ? assessment.summary : undefined);

  const onChange = useCallback((value: string) => {
    setSummary(value);
  }, []);

  return (<>
    <PageBreadcrumb current='评估详情' parents={[
      { name: "一对一导师管理", link: "/partnerships" },
      { name: "评估列表", link: `/partnerships/${partnershipId}/assessments` },
    ]} />

    {!assessment ? <Loader /> : <MarkdownEditor 
      value={summary || ''}
      onChange={onChange}
    />}
  </>);
}
