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
  AspectRatio,
} from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useState, useEffect } from "react";
import { ProjectStatus, ProjectVisibility } from "../../shared/Project";
import { useRouter } from "next/router";
import PageLoader from "../PageLoader";
import useMe from "../../useMe";
import { isPermitted } from "../../shared/Role";
import UserSelector from "../UserSelector";

export default function ProjectEditor({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const me = useMe();

  const isEdit = !!projectId;

  const { data: project, isLoading } = trpcNext.projects.get.useQuery(
    { id: projectId! },
    { enabled: isEdit, retry: false },
  );

  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Draft");
  const [visibility, setVisibility] = useState<ProjectVisibility>("Public");
  const [ownerId, setOwnerId] = useState<string>("");

  const [intro, setIntro] = useState("");
  const [bg, setBg] = useState("");
  const [challenge, setChallenge] = useState("");
  const [video, setVideo] = useState("");
  const [reqs, setReqs] = useState("");
  const [refs, setRefs] = useState("");
  const [videoLoading, setVideoLoading] = useState(false);
  const isAdmin = me ? isPermitted(me.roles, "ProjectAdmin") : false;

  useEffect(() => {
    if (isEdit && project) {
      setTitle(project.title);
      setStatus(project.status);
      setVisibility(project.visibility);
      setOwnerId(project.ownerId);
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

    const payload = {
      title,
      status,
      visibility,
      ...(isAdmin && ownerId ? { ownerId } : {}),
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
              <FormControl>
                <FormLabel>负责人</FormLabel>
                <UserSelector
                  isMulti={false}
                  onSelect={(ids) => setOwnerId(ids[0] || "")}
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>项目标题</FormLabel>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>可见性</FormLabel>
              <Select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as ProjectVisibility)
                }
              >
                <option value="Public">公开</option>
                <option value="Confidential">保密</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>状态</FormLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              >
                <option value="Draft">草稿</option>
                <option value="Open">招募中</option>
                <option value="Closed">已结束</option>
              </Select>
            </FormControl>

            <MarkdownSupport prefix="以下字段均" />

            <FormControl isRequired>
              <FormLabel>项目简介</FormLabel>
              <Textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="一句话或简短的一段话介绍项目核心"
              />
            </FormControl>

            <FormControl>
              <FormLabel>项目背景</FormLabel>
              <Textarea
                rows={4}
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>挑战描述</FormLabel>
              <Textarea
                rows={6}
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>学生画像要求</FormLabel>
              <Textarea
                rows={4}
                value={reqs}
                onChange={(e) => setReqs(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>参考材料</FormLabel>
              <Textarea
                rows={4}
                value={refs}
                onChange={(e) => setRefs(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>视频链接</FormLabel>

              <Link
                onClick={async () => {
                  setVideoLoading(true);
                  try {
                    const uploadToken =
                      await trpc.users.getJinshujuXField.query();
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
                    <Text>加载中...</Text>
                  </HStack>
                ) : video ? (
                  <HStack>
                    <MdChangeCircle />
                    <Text>更换视频</Text>
                  </HStack>
                ) : (
                  <HStack>
                    <MdCloudUpload />
                    <Text>上传视频</Text>
                  </HStack>
                )}
              </Link>
              {video && (
                <AspectRatio ratio={16 / 9} mt={2}>
                  <video src={video} controls preload="metadata" />
                </AspectRatio>
              )}
            </FormControl>

            <Button
              type="submit"
              colorScheme="brand"
              size="lg"
              isLoading={createMutation.isLoading || updateMutation.isLoading}
              mt={4}
            >
              {isEdit ? "保存修改" : "提交发布"}
            </Button>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
}
