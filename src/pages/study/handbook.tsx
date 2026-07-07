import StudyExamPage from "components/StudyExamPage";

const title = "《社会导师手册》自学与评测";

export default function Page() {
  return (
    <StudyExamPage
      title={title}
      description="此手册是一对一导师的重要参考资料，总结了导师在辅助学生时应遵循的原则和方法框架。"
      links={[
        {
          href: "https://yuanjian.notion.site/37136363e907807685b3daba4cb5c2cf",
          text: "阅读《社会导师手册》",
        },
      ]}
      examFormId="wqPdKE"
      examStateKey="handbookExam"
    />
  );
}

Page.title = title;
