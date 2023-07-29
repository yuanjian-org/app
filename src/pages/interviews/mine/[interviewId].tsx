import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  RadioGroup,
  HStack,
  Radio,
  Box,
  Icon,
  Center,
  Heading,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import GroupBar from 'components/GroupBar';
import { sidebarBreakpoint } from 'components/Navbars';
import { useUserContext } from 'UserContext';
import invariant from "tiny-invariant";
import { Interview } from 'shared/Interview';
import { MdKeyboardDoubleArrowRight, MdKeyboardArrowLeft, MdKeyboardArrowRight, MdKeyboardDoubleArrowLeft 
} from 'react-icons/md';
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { formatUserName } from 'shared/strings';
import { useState } from 'react';
import Autosaver from 'components/Autosaver';

const Page: NextPageWithLayout = () => {
  const interviewId = parseQueryParameter(useRouter(), 'interviewId');
  const { data: interview } = trpcNext.interviews.get.useQuery(interviewId);
  
  if (!interview) return <Loader />;

  return <>
    <PageBreadcrumb current={formatUserName(interview.interviewee.name, "formal")} parents={[{
      name: "我的面试", link: "/interviews/mine",
    }]}/>
    <GroupBar group={interview.group} showJoinButton showGroupName={false} marginBottom={8} />
    <Grid templateColumns={{ base: "1fr", [sidebarBreakpoint]: "1fr 1fr" }} gap={10}>
      <GridItem>
        <FeedbackEditor interview={interview} />
      </GridItem>
      <GridItem>
        <Box></Box>
      </GridItem>
    </Grid>
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;

type Feedback = {
  summary: string,
  dimentions: FeedbackDimension[],
};

type FeedbackDimension = {
  name: string,
  score: number,
  comment: string,
};

function FeedbackEditor({ interview }: { 
  interview: Interview,
}) {
  const [me] = useUserContext();
  const feedbacks = interview.feedbacks.filter(f => f.interviewer.id === me.id);
  invariant(feedbacks.length == 1);
  const { data: feedback } = trpcNext.interviewFeedbacks.get.useQuery(feedbacks[0].id);

  const dimensionNames = ["成绩优秀", "心中有爱", "脑中有料", "眼中有光", "脚下有土", "开放与成长思维", "个人潜力", "远见价值"];

  const saveDimension = async (edited: FeedbackDimension) => {
    console.log(">>>", edited);
  };

  return !feedback ? <Loader /> : <Flex direction="column" gap={6}>
    {dimensionNames.map(dn => 
      <FeedbackDimensionEditor 
        key={`${feedback.id}-${dn}`} 
        editorKey={`${feedback.id}-${dn}`} 
        name={dn}
        text={''}
        onSave={async (d) => await saveDimension(d)} />
    )}
  </Flex>;
}

function FeedbackDimensionEditor({ editorKey, name, text, onSave }: {
  editorKey: string,
  name: string,
  text: string | null,
  onSave: (d: FeedbackDimension) => Promise<void>,
}) {
  const [score, setScore] = useState(1);
  const [comment, setComment] = useState<string>("");
  const [showTooltip, setShowTooltip] = useState(false);

  const labels = ["明显低于预期", "低于预期", "达到预期", "高于预期", "明显高于预期"];  
  
  const save = async () => await onSave({ name, score, comment });

  return <>
    <Flex direction="row" gap={3}>
      <Box minWidth={120}>{name}</Box>
      <Slider min={1} max={5} step={1} defaultValue={score}
        onChange={setScore}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <SliderTrack><SliderFilledTrack bg="brand.b" /></SliderTrack>
        <SliderMark value={1}>.</SliderMark>
        <SliderMark value={2}>.</SliderMark>
        <SliderMark value={3}>.</SliderMark>
        <SliderMark value={4}>.</SliderMark>
        <SliderMark value={5}>.</SliderMark>
        <Tooltip
          hasArrow
          placement='top'
          isOpen={showTooltip}
          label={`${score}: ${labels[score - 1]}`}
        >
          <SliderThumb bg="brand.b" />
        </Tooltip>
      </Slider>
      <Autosaver data={score} onSave={async (_) => await onSave({ name, score, comment })} />
    </Flex>
    <AutosavingMarkdownEditor key={editorKey} initialValue={text || ''} 
      onSave={async (edited) => { setComment(edited); await onSave({ name, score, comment: edited }); }}
      placeholder="填写评分理由（自动保存）"
      toolbar={false} status={false} maxHeight="60px" />
  </>;
}