import { toast } from "react-toastify";

import { MdChangeCircle, MdCloudUpload } from "react-icons/md";

import MarkdownSupport from "../MarkdownSupport";
import trpc from "../../trpc";
import { getEmbeddedFormUrl } from "../../pages/form";

import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  Card,
  CardBody,
  HStack,
  Spinner,
  Text,
  Link,
  Box,
} from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useState, useEffect } from "react";
import MarkdownStyler from "../MarkdownStyler";
import { ProjectStatus, ProjectVisibility } from "../../shared/Project";
import { useRouter } from "next/router";
import PageLoader from "../PageLoader";
import useMe from "../../useMe";
import { isPermitted } from "../../shared/Role";
import UserSelector from "../UserSelector";
import { componentSpacing } from "theme/metrics";
import { features } from "../../shared/Features";
import T from "components/T";
import { useTranslation } from "next-i18next";

export default function ProjectEditor({ projectId }: { projectId?: string }) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const me = useMe();

  const isEdit = !!projectId;

  const { data: project, isLoading } = trpcNext.projects.get.useQuery(
    { id: projectId! },
    { enabled: isEdit, retry: false },
  );

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("草稿");
  const [visibility, setVisibility] = useState<ProjectVisibility>("公开");
  const [ownerId, setOwnerId] = useState<string>(me.id);
  const [orgId, setOrgId] = useState<string>("");

  const [intro, setIntro] = useState("");
  const [bg, setBg] = useState("");
  const [challenge, setChallenge] = useState("");
  const [video, setVideo] = useState("");
  const [reqs, setReqs] = useState("");
  const [refs, setRefs] = useState("");

  const [hasChanged, setHasChanged] = useState(false);

  const [videoLoading, setVideoLoading] = useState(false);
  const [refsLoading, setRefsLoading] = useState(false);
  const isAdmin = me ? isPermitted(me.roles, "ProjectAdmin") : false;

  const { data: orgs } = trpcNext.orgs.list.useQuery(undefined, {
    enabled: !!features.orgs,
  });

  useEffect(() => {
    if (isEdit && project) {
      setTitle(project.title);
      setStatus(project.status);
      setVisibility(project.visibility);
      setOwnerId(project.ownerId);
      setOrgId(project.orgId || "");
      setIntro(project.profile?.简介 || "");
      setBg(project.profile?.背景 || "");
      setChallenge(project.profile?.挑战描述 || "");
      setVideo(project.profile?.视频链接 || "");
      setReqs(project.profile?.学生要求 || "");
      setRefs(project.profile?.参考材料 || "");
    }
  }, [project, isEdit]);

  const createMutation = trpcNext.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("项目创建成功");
      void router.push(`/projects/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCancel = () => {
    if (hasChanged) {
      if (!window.confirm("有未保存的更改，确定要返回吗？")) {
        return;
      }
    }
    router.back();
  };

  const updateMutation = trpcNext.projects.update.useMutation({
    onSuccess: (data) => {
      toast.success("项目更新成功");
      void router.push(`/projects/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.warning("请输入项目标题");
      return;
    }

    if (isAdmin && !ownerId) {
      toast.warning("请选择项目负责人");
      return;
    }

    const payload = {
      title,
      status,
      visibility,
      ...(isAdmin ? { ownerId } : {}),
      orgId: orgId || null,
      profile: {
        简介: intro,
        背景: bg,
        挑战描述: challenge,
        视频链接: video,
        学生要求: reqs,
        参考材料: refs,
      },
    };

    if (isEdit) {
      void updateMutation.mutate({ id: projectId!, ...payload });
    } else {
      void createMutation.mutate(payload);
    }
  };

  if (isEdit && isLoading) return <PageLoader />;

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit}>
          <VStack spacing={5} align="stretch">
            {isAdmin && (
              <FormControl isRequired>
                <FormLabel>
                  <T>负责人</T>
                </FormLabel>
                <UserSelector
                  isMulti={false}
                  initialValue={isEdit && project ? [project.owner] : [me]}
                  onSelect={(ids) => {
                    setOwnerId(ids[0] || "");
                    setHasChanged(true);
                  }}
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>
                <T>项目标题</T>
              </FormLabel>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanged(true);
                }}
              />
            </FormControl>

            {features.orgs && (
              <FormControl>
                <FormLabel>
                  <T>所属机构</T>
                </FormLabel>
                <Select
                  value={orgId}
                  onChange={(e) => {
                    setOrgId(e.target.value);
                    setHasChanged(true);
                  }}
                >
                  <option value="">
                    <T>无机构</T>
                  </option>
                  {orgs?.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>
                <T>可见性</T>
              </FormLabel>
              <Select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as ProjectVisibility)
                }
              >
                <option value="公开">
                  <T>公开</T>
                </option>
                <option value="保密">
                  <T>保密</T>
                </option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>
                <T>状态</T>
              </FormLabel>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ProjectStatus);
                  setHasChanged(true);
                }}
              >
                <option value="草稿">
                  <T>草稿</T>
                </option>
                <option value="招募中">
                  <T>招募中</T>
                </option>
                <option value="已结束">
                  <T>已结束</T>
                </option>
              </Select>
            </FormControl>

            <MarkdownSupport prefix="以下字段均" />

            <FormControl isRequired>
              <FormLabel>
                <T>项目简介</T>
              </FormLabel>
              <Textarea
                value={intro}
                onChange={(e) => {
                  setIntro(e.target.value);
                  setHasChanged(true);
                }}
                placeholder={t("一句话或简短的一段话介绍项目核心")}
              />
            </FormControl>

            <FormControl>
              <FormLabel>
                <T>项目背景</T>
              </FormLabel>
              <Textarea
                rows={4}
                value={bg}
                onChange={(e) => {
                  setBg(e.target.value);
                  setHasChanged(true);
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel>
                <T>挑战描述</T>
              </FormLabel>
              <Textarea
                rows={6}
                value={challenge}
                onChange={(e) => {
                  setChallenge(e.target.value);
                  setHasChanged(true);
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel>
                <T>学生画像要求</T>
              </FormLabel>
              <Textarea
                rows={4}
                value={reqs}
                onChange={(e) => {
                  setReqs(e.target.value);
                  setHasChanged(true);
                }}
              />
            </FormControl>

            <FormControl>
              <FormLabel>
                <T>视频链接</T>
              </FormLabel>

              <Link
                onClick={async () => {
                  if (!isEdit || hasChanged) {
                    toast.warning("请先保存项目后再上传视频");
                    return;
                  }
                  setVideoLoading(true);
                  try {
                    const uploadToken =
                      await trpc.users.getJinshujuXField.query({
                        uploadTarget: "project",
                        projectId: projectId!,
                      });
                    await router.push(
                      getEmbeddedFormUrl("nhFsf1", uploadToken),
                    );
                  } finally {
                    setVideoLoading(false);
                  }
                }}
              >
                {videoLoading ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text>
                      <T>加载中...</T>
                    </Text>
                  </HStack>
                ) : video ? (
                  <HStack>
                    <MdChangeCircle />
                    <Text>
                      <T>更换视频</T>
                    </Text>
                  </HStack>
                ) : (
                  <HStack>
                    <MdCloudUpload />
                    <Text>
                      <T>上传视频</T>
                    </Text>
                  </HStack>
                )}
              </Link>
              {video && (
                <Box mt={componentSpacing}>
                  <video
                    src={video}
                    controls
                    // Allow editor to download the video
                    style={{
                      maxWidth: "500px",
                      maxHeight: "500px",
                    }}
                  />
                </Box>
              )}
            </FormControl>

            <FormControl>
              <FormLabel>
                <T>参考材料</T>
              </FormLabel>

              <Link
                onClick={async () => {
                  if (!isEdit || hasChanged) {
                    toast.warning("请先保存项目后再上传参考材料");
                    return;
                  }
                  setRefsLoading(true);
                  try {
                    const uploadToken =
                      await trpc.users.getJinshujuXField.query({
                        uploadTarget: "project",
                        projectId: projectId!,
                      });
                    await router.push(
                      getEmbeddedFormUrl("zF1xqk", uploadToken),
                    );
                  } finally {
                    setRefsLoading(false);
                  }
                }}
              >
                {refsLoading ? (
                  <HStack>
                    <Spinner size="sm" />
                    <Text>
                      <T>加载中...</T>
                    </Text>
                  </HStack>
                ) : refs ? (
                  <HStack>
                    <MdChangeCircle />
                    <Text>
                      <T>更换材料</T>
                    </Text>
                  </HStack>
                ) : (
                  <HStack>
                    <MdCloudUpload />
                    <Text>
                      <T>上传材料</T>
                    </Text>
                  </HStack>
                )}
              </Link>
              {refs && (
                <Box mt={componentSpacing}>
                  <MarkdownStyler content={refs} />
                </Box>
              )}
            </FormControl>

            <HStack spacing={4} mt={4}>
              <Button
                type="submit"
                colorScheme="brand"
                size="lg"
                isLoading={createMutation.isLoading || updateMutation.isLoading}
              >
                {isEdit ? "保存修改" : "提交发布"}
              </Button>
              <Button size="lg" onClick={handleCancel}>
                <T>取消</T>
              </Button>
            </HStack>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
}
