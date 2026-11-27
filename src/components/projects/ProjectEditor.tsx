// @i18n-ignore-file
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
import useMe from "../../useMe";
import { isPermitted } from "../../shared/Role";
import UserSelector from "../UserSelector";
import { componentSpacing } from "theme/metrics";
import { features } from "../../shared/Features";
import Loader from "components/Loader";

export default function ProjectEditor({ projectId }: { projectId?: string }) {
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

  if (isEdit && isLoading) return <Loader />;

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit}>
          <VStack spacing={5} align="stretch">
            {isAdmin && (
              <FormControl isRequired>
                <FormLabel>负责人</FormLabel>
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
              <FormLabel>项目标题</FormLabel>
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
                <FormLabel>所属机构</FormLabel>
                <Select
                  value={orgId}
                  onChange={(e) => {
                    setOrgId(e.target.value);
                    setHasChanged(true);
                  }}
                >
                  <option value="">无机构</option>
                  {orgs?.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>可见性</FormLabel>
              <Select
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as ProjectVisibility)
                }
              >
                <option value="公开">公开</option>
                <option value="未列出">未列出</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>状态</FormLabel>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as ProjectStatus);
                  setHasChanged(true);
                }}
              >
                <option value="草稿">草稿</option>
                <option value="招募中">招募中</option>
                <option value="已结束">已结束</option>
              </Select>
            </FormControl>

            <MarkdownSupport prefix="以下字段均" />

            <FormControl isRequired>
              <FormLabel>项目简介</FormLabel>
              <Textarea
                value={intro}
                onChange={(e) => {
                  setIntro(e.target.value);
                  setHasChanged(true);
                }}
                placeholder={"一句话或简短的一段话介绍项目核心"}
              />
            </FormControl>

            <FormControl>
              <FormLabel>项目背景</FormLabel>
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
              <FormLabel>挑战描述</FormLabel>
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
              <FormLabel>学生画像要求</FormLabel>
              <Textarea
                rows={4}
                value={reqs}
                onChange={(e) => {
                  setReqs(e.target.value);
                  setHasChanged(true);
                }}
              />
            </FormControl>

            <ProjectMediaUploadField
              label="视频链接"
              formId="nhFsf1"
              projectId={projectId}
              hasChanged={hasChanged}
              hasValue={!!video}
              unsavedWarning="请先保存项目后再上传视频"
              uploadLabel="上传视频"
              changeLabel="更换视频"
            >
              <video
                src={video}
                controls
                // Allow editor to download the video
                style={{
                  maxWidth: "500px",
                  maxHeight: "500px",
                }}
              />
            </ProjectMediaUploadField>

            <ProjectMediaUploadField
              label="参考材料"
              formId="zF1xqk"
              projectId={projectId}
              hasChanged={hasChanged}
              hasValue={!!refs}
              unsavedWarning="请先保存项目后再上传参考材料"
              uploadLabel="上传材料"
              changeLabel="更换材料"
            >
              <MarkdownStyler content={refs} />
            </ProjectMediaUploadField>

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
                取消
              </Button>
            </HStack>
          </VStack>
        </form>
      </CardBody>
    </Card>
  );
}

/**
 * Form field for uploading or replacing project media via an embedded Jinshuju
 * form, showing an optional preview when media is already present.
 */
function ProjectMediaUploadField({
  label,
  formId,
  projectId,
  hasChanged,
  hasValue,
  unsavedWarning,
  uploadLabel,
  changeLabel,
  children,
}: {
  label: string;
  formId: string;
  projectId?: string;
  hasChanged: boolean;
  hasValue: boolean;
  unsavedWarning: string;
  uploadLabel: string;
  changeLabel: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUploadClick = async () => {
    if (!projectId || hasChanged) {
      toast.warning(unsavedWarning);
      return;
    }
    setLoading(true);
    try {
      const uploadToken = await trpc.users.getJinshujuXField.query({
        uploadTarget: "project",
        projectId,
      });
      await router.push(getEmbeddedFormUrl(formId, uploadToken));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>

      <Link onClick={handleUploadClick}>
        {loading ? (
          <HStack>
            <Spinner size="sm" />
            <Text>加载中...</Text>
          </HStack>
        ) : hasValue ? (
          <HStack>
            <MdChangeCircle />
            <Text>{changeLabel}</Text>
          </HStack>
        ) : (
          <HStack>
            <MdCloudUpload />
            <Text>{uploadLabel}</Text>
          </HStack>
        )}
      </Link>
      {hasValue && <Box mt={componentSpacing}>{children}</Box>}
    </FormControl>
  );
}
