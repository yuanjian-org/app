import StudyPage from "components/study/StudyPage";

const title = "面试官自学与评测";

export default function Page() {
  return (
    <StudyPage
      title={title}
      description="面试官是候选人了解社会导师制的第一扇窗口。请充分准备面试，为每位候选人留下良好的第一印象。"
      steps={[
        {
          label: "阅读《招生流程与须知》",
          url: "https://www.notion.so/yuanjian/4616bf621b5b41fbbd62477d66d87ffe",
        },
        {
          label: "阅读《面试标准与参考题库》",
          url: "https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064",
        },
      ]}
      formId="w02l95"
      examDateKey="menteeInterviewerExam"
    />
  );
}

Page.title = title;
