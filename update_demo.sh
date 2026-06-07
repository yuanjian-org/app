sed -i 's/await generateOrgs(t);/await generateOrgs(t);\n  if (process.env.ENABLE_PROJECTS === "true") {\n    await createProjects(t);\n  }/g' src/api/routes/generateDemoData.ts
cat << 'INNER_EOF' >> src/api/routes/generateDemoData.ts

async function createProjects(t: Transaction) {
  console.log("Creating projects...");
  const p1 = await db.Project.create(
    {
      creatorId: "mentor1", // Assuming id(mentor1) would resolve to "mentor1" for simplicity in this script addition
      title: "第三代半导体在光催化环境下的氧化、磨损机理研究",
      profile: {
        "Background": "半导体材料在特殊环境下的应用研究日益重要。",
        "Challenge Description": "本课题致力于探索第三、四代半导体在光催化环境下的摩擦与磨损机理，期望能在源头创新领域取得重大突破。",
        "Video": "https://example.com/video1.mp4",
        "学生画像要求": "物理、材料或相关专业背景，对科研有热情，具备基础实验能力。",
      },
      requireLogin: true,
      isPublished: true,
    },
    { transaction: t }
  );

  await db.ProjectApplication.create(
    {
      projectId: p1.id,
      applicantId: "mentee1",
      content: "我非常有兴趣参与此项目，这是我的简历...",
      status: "Pending",
    },
    { transaction: t }
  );

  await db.Project.create(
    {
      creatorId: "mentor2",
      title: "摩尔云纹尺度粘滑摩擦的温度速度依赖性探究",
      profile: {
        "Background": "摩擦学在微观尺度的研究是前沿挑战。",
        "Challenge Description": "研究温度和速度对摩尔云纹尺度粘滑摩擦的影响。",
        "Video": "https://example.com/video2.mp4",
        "学生画像要求": "力学或相关专业，熟悉实验方法。",
      },
      requireLogin: false,
      isPublished: true,
    },
    { transaction: t }
  );
}
INNER_EOF
