import StudyPage from "components/study/StudyPage";

const title = "《社会导师手册》自学与评测";

export default function Page() {
  return (
    <StudyPage
      title={title}
      description="此手册是一对一导师的重要参考资料，总结了导师在辅助学生时应遵循的原则和方法框架。"
      steps={[
        {
          label: "阅读《社会导师手册》",
          url: "https://yuanjian.notion.site/37136363e907807685b3daba4cb5c2cf",
        },
      ]}
      formId="wqPdKE"
      examDateKey="handbookExam"
    />
  );
}

Page.title = title;
