import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem,
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Tooltip,
  Icon,
  Link,
  UnorderedList,
  ListItem,
  Text,
} from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';
import { useUserContext } from 'UserContext';
import invariant from "tiny-invariant";
import { Interview } from 'shared/Interview';
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { formatUserName } from 'shared/strings';
import { useEffect, useState } from 'react';
import Autosaver from 'components/Autosaver';
import { InterviewFeedback } from 'shared/InterviewFeedback';
import _ from "lodash";
import MenteeApplication from 'components/MenteeApplication';
import { BsWechat } from "react-icons/bs";
import { MinUser } from 'shared/User';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import moment from "moment";
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';

const Page: NextPageWithLayout = () => {
  const interviewId = parseQueryParameter(useRouter(), 'interviewId');
  const { data: interview } = trpcNext.interviews.get.useQuery(interviewId);
  const { data: meNoCache } = trpcNext.users.meNoCache.useQuery();

  const interviewerTestPassed = () => {
    const passed = meNoCache?.menteeInterviewerTestLastPassedAt;
    return passed ? moment().diff(moment(passed), "days") < 300 : false;
  }

  if (!interview) return <Loader />;

  return <>
    <PageBreadcrumb current={formatUserName(interview.interviewee.name, "formal")} parents={[{
      name: "我的面试", link: "/interviews/mine",
    }]}/>

    {!meNoCache ? <Loader /> : !interviewerTestPassed() ? <PassTestFirst /> :
      // <GroupBar group={interview.group} showGroupName={false} showJoinButton marginBottom={8} />
      // TODO: For some reason "1fr 1fr" doens't work
      <Grid templateColumns={{ base: "100%", [sidebarBreakpoint]: "47% 47%" }} gap={sectionSpacing}>
        <GridItem>
          <Flex direction="column" gap={sectionSpacing}>
            <Instructions interviewers={interview.feedbacks.map(f => f.interviewer)} />
            <FeedbackEditor interview={interview} />
          </Flex>
        </GridItem>
        <GridItem>
          {interview.type == "MenteeInterview" ? <MenteeApplication menteeUserId={interview.interviewee.id} /> : <Box />}
        </GridItem>
      </Grid>
    }
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;

function PassTestFirst() {
  return <Flex direction="column" gap={paragraphSpacing}>
    <b>请首先完成面试官测试</b>
    <p>通过<Link isExternal href="https://jinshuju.net/f/w02l95">《面试流程和标准测试》</Link>后，刷新此页，即可看到面试信息。</p>
  </Flex>;
}

function Instructions({ interviewers }: {
  interviewers: MinUser[],
}) {
  const [me] = useUserContext();

  let first: boolean | null = null;
  let other: MinUser | null = null;
  invariant(interviewers.filter(i => i.id === me.id).length == 1);
  if (interviewers.length == 2) {
    other = interviewers[0].id === me.id ? interviewers[1] : interviewers[0];
    first = other.id > me.id;
  }

  const marginEnd = 1.5;
  return <Flex direction="column" gap={sectionSpacing}>
    {/* <b>面试官必读</b> */}
    <UnorderedList>
      <ListItem>用<Icon as={BsWechat} marginX={1.5} />微信发起视频群聊。</ListItem>
      {first !== null && <>
        <ListItem>
          你负责<mark>提问维度 {first ? "1 到 4" : "5 到 8"} </mark>的问题；
          {formatUserName(other?.name ?? null, "friendly")}负责维度 {first ? "5 到 8" : "1 到 4"}。
        </ListItem>
        <ListItem><mark>填写所有八个维度</mark>的评价和总评。</ListItem>
      </>}
      <ListItem>
        <Link isExternal href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064">
          面试维度和参考题库 <ExternalLinkIcon />
        </Link>
      </ListItem>
      <ListItem>
        <Link isExternal href="https://www.notion.so/yuanjian/4616bf621b5b41fbbd62477d66d87ffe">
          面试须知 <ExternalLinkIcon />
        </Link>
      </ListItem>
    </UnorderedList>
  </Flex>;
}

type Feedback = {
  dimensions: FeedbackDimension[],
};

type FeedbackDimension = {
  name: string,
  score: number,
  comment: string,
};

const defaultScore = 1;
const defaultComment = "";

function findDimension(f: Feedback | null, dimensionName: string): FeedbackDimension | null {
  if (!f) return null;
  const ds = f.dimensions.filter(d => d.name === dimensionName);
  if (ds.length > 0) {
    invariant(ds.length == 1);
    return ds[0];
  } else {
    return null;
  }
}

function FeedbackEditor({ interview }: { 
  interview: Interview,
}) {
  const [me] = useUserContext();

  const getFeedbackId = () => {
    const feedbacks = interview.feedbacks.filter(f => f.interviewer.id === me.id);
    invariant(feedbacks.length == 1);
    return feedbacks[0].id;
  };

  const feedbackId = getFeedbackId();
  const { data: interviewFeedback } = trpcNext.interviewFeedbacks.get.useQuery<InterviewFeedback | null>(feedbackId);
  const getFeedback = () => interviewFeedback?.feedback ? interviewFeedback.feedback as Feedback : { dimensions: [] };

  const dimensionNames = ["成绩优秀", "心中有爱", "脑中有料", "眼中有光", "脚下有土", "开放与成长思维", "个人潜力", "远见价值"];
  const summaryDimensionName = "总评";
  const summaryDimensions = getFeedback().dimensions.filter(d => d.name === summaryDimensionName);
  const summaryDimension = summaryDimensions.length == 1 ? summaryDimensions[0] : null;

  const saveDimension = async (edited: FeedbackDimension) => {
    const old = getFeedback();
    const f = structuredClone(old);
    const d = findDimension(f, edited.name);
    if (edited.score == defaultScore && edited.comment == defaultComment) {
      f.dimensions = f.dimensions.filter(d => d.name !== edited.name);
    } else if (d) {
      d.score = edited.score;
      d.comment = edited.comment;
    } else {
      f.dimensions.push(edited);
    }
    
    if (_.isEqual(f, old)) return;
    await trpc.interviewFeedbacks.update.mutate({ id: feedbackId, feedback: f });    
  };

  return !interviewFeedback ? <Loader /> : <Flex direction="column" gap={6}>
    <FeedbackDimensionEditor 
      editorKey={`${feedbackId}-${summaryDimensionName}`}
      dimensionName={summaryDimensionName}
      dimensionLabel={`${summaryDimensionName}与备注`}
      scoreLabels={["拒", "弱拒", "弱收", "收"]}
      initialScore={summaryDimension?.score || defaultScore}
      initialComment={summaryDimension?.comment || defaultComment}
      onSave={async (d) => await saveDimension(d)}
    />

    {dimensionNames.map((dn, idx) => {
      const d = findDimension(getFeedback(), dn);
      return <FeedbackDimensionEditor 
        key={dn} 
        editorKey={`${feedbackId}-${dn}`}
        dimensionName={dn}
        dimensionLabel={`${idx + 1}. ${dn}`}
        scoreLabels={["明显低于预期", "低于预期", "达到预期", "高于预期", "明显高于预期"]}
        initialScore={d?.score || defaultScore}
        initialComment={d?.comment || defaultComment}
        onSave={async (d) => await saveDimension(d)}
      />;
    })}
  </Flex>;
}

/**
 * N.B. scores are 1-indexed while labels are 0-index.
 */
function FeedbackDimensionEditor({ 
  editorKey, dimensionName, dimensionLabel, scoreLabels, initialScore, initialComment, onSave,
}: {
  editorKey: string,
  dimensionName: string,
  dimensionLabel: string,
  scoreLabels: string[],
  initialScore: number,
  initialComment: string,
  onSave: (d: FeedbackDimension) => Promise<void>,
}) {
  const [score, setScore] = useState<number>(initialScore);
  const [comment, setComment] = useState<string>(initialComment);
  const [showTooltip, setShowTooltip] = useState(false);

  return <>
    <Flex direction="row" gap={3}>
      <Box minWidth={140}><b>{dimensionLabel}</b></Box>
      <Slider min={1} max={scoreLabels.length} step={1} defaultValue={initialScore}
        onChange={setScore}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <SliderTrack><SliderFilledTrack bg="brand.b" /></SliderTrack>
        {scoreLabels.map((_, idx) => <SliderMark key={idx} value={idx + 1}>.</SliderMark>)}
        <Tooltip
          hasArrow
          placement='top'
          isOpen={showTooltip}
          label={`${score}: ${scoreLabels[score - 1]}`}
        >
          <SliderThumb bg="brand.b" />
        </Tooltip>
      </Slider>
      <Autosaver
        // This conditional is to prevent initial page loading from triggering auto saving.
        data={score == initialScore ? null : score} 
        onSave={async (_) => await onSave({ name: dimensionName, score, comment })}
      />
    </Flex>
    <AutosavingMarkdownEditor
      key={editorKey} 
      initialValue={initialComment} 
      onSave={async (edited) => { setComment(edited); await onSave({ name: dimensionName, score, comment: edited }); }}
      placeholder="评分理由（自动保存）"
      toolbar={false} 
      status={false} 
      maxHeight="120px" 
    />
  </>;
}