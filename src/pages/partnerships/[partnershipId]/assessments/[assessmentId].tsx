
import React, { useMemo } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../AppLayout";
import { trpcNext } from "../../../../trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import { parseQueryParameter } from '../../../../parseQueryParamter';
import Assessment from 'shared/Assessment';
import Loader from 'components/Loader';

const Page: NextPageWithLayout = () => <AssessmentEditor />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function AssessmentEditor() {
  const router = useRouter();
  const id = parseQueryParameter(router, "assessmentId");
  const partnershipId = parseQueryParameter(router, "partnershipId");
  const { data: assessment } = trpcNext.assessments.get.useQuery<Assessment>({ id });

  return (<>
    <PageBreadcrumb current='评估详情' parents={[
      { name: "一对一导师管理", link: "/partnerships" },
      { name: "评估列表", link: `/partnerships/${partnershipId}/assessments` },
    ]} />

    {!assessment ? <Loader /> : <Editor 
      value={assessment.summary || ''} />
    }
  </>);
}

// Markdown editor from https://www.npmjs.com/package/react-simplemde-editor.
// Beow is a hack from https://github.com/dabit3/next.js-amplify-workshop/issues/21#issuecomment-843188036 to work around
// the "navigator is not defined" issue.
import "easymde/dist/easymde.min.css";
import dynamic from "next/dynamic";
const SimpleMdeEditor = dynamic(
	() => import("react-simplemde-editor"),
	{ ssr: false }
);

function Editor(props : { value: string }) {
  // See https://www.npmjs.com/package/react-simplemde-editor#options on why using memo here.
  const options = useMemo(() => ({
      spellChecker: false,
      readOnly: true,
    }), []);
  return <SimpleMdeEditor value={props.value} options={options} />;
}
