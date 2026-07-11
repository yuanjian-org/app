// @i18n-ignore-file
import { useRouter } from "next/router";
import {
  Card,
  CardBody,
  CardHeader,
  Flex,
  Badge,
  Select,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { trpcNext } from "trpc";
import Head from "next/head";
import { ProjectApplication } from "components/ProjectApplication";
import { ProjectApplicationStatus } from "shared/ProjectApplication";
import { formatUserName } from "shared/strings/formatUserName";
import { toast } from "react-toastify";
import Loader from "components/Loader";

export default function Page() {
  const router = useRouter();
  const id = router.query.id as string;
  const utils = trpcNext.useContext();

  const { data: project } = trpcNext.projects.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const { data: applications } = trpcNext.projectApplications.list.useQuery(
    { projectId: id },
    { enabled: !!id },
  );

  const updateStatus = trpcNext.projectApplications.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("状态已更新");
      void utils.projectApplications.list.invalidate({ projectId: id });
    },
  });

  if (!project || !applications) return <Loader />;

  return (
    <>
      <Head>
        <title>
          项目申请：
          {project.title} ｜ 远图
        </title>
      </Head>
      <VStack spacing={6} align="stretch">
        {applications.length === 0 ? (
          <Text>暂无申请</Text>
        ) : (
          applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <Flex justify="space-between" align="center">
                  <HStack spacing={4}>
                    <Text fontSize="lg" fontWeight="bold">
                      {formatUserName(app.user?.name || "未知用户")}
                    </Text>
                    <Badge
                      colorScheme={
                        app.status === "已批准"
                          ? "green"
                          : app.status === "已拒绝"
                            ? "red"
                            : "yellow"
                      }
                    >
                      {app.status || "待处理"}
                    </Badge>
                  </HStack>
                  <Select
                    width="200px"
                    value={app.status || ""}
                    onChange={(e) =>
                      updateStatus.mutate({
                        id: app.id,
                        status: (e.target.value ||
                          null) as ProjectApplicationStatus,
                      })
                    }
                  >
                    <option value="已批准">已批准</option>
                    <option value="已拒绝">已拒绝</option>
                    <option value="">待处理</option>
                  </Select>
                </Flex>
              </CardHeader>
              <CardBody>
                <ProjectApplication application={app.application} />
              </CardBody>
            </Card>
          ))
        )}
      </VStack>
    </>
  );
}
Page.title = "项目申请";

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
