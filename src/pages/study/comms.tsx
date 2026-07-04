import StudyPage from "components/study/StudyPage";

const title = "《学生通讯原则》自学与评测";

export default function Page() {
  return (
    <StudyPage
      title={title}
      description="这份材料介绍志愿者与学生沟通时的注意事项，并提供具体的情景分析。"
      steps={[
        {
          label: "阅读《学生通讯原则》",
          url: "https://yuanjian.notion.site/37636363e90780e28c2adee62ffebc09",
        },
      ]}
      formId="nsnx4G"
      examDateKey="commsExam"
    />
  );
}

Page.title = title;
