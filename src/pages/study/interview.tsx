import StudyExamPage from "components/StudyExamPage";

const title = "面试官自学与评测";

export default function Page() {
  return (
    <StudyExamPage
      title={title}
      description="面试官是候选人了解社会导师制的第一扇窗口。请充分准备面试，为每位候选人留下良好的第一印象。"
      links={[
        {
          href: "https://www.notion.so/yuanjian/4616bf621b5b41fbbd62477d66d87ffe",
          text: "阅读《招生流程与须知》",
        },
        {
          href: "https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064",
          text: "阅读《面试标准与参考题库》",
        },
      ]}
      examFormId="w02l95"
      examStateKey="menteeInterviewerExam"
    />
  );
}

Page.title = title;

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
