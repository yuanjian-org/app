import getI18nProps from "components/getI18nProps";
import T from "components/T";
import {
  CardBody,
  Heading,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Th,
  Tr,
  VStack,
  Text,
  Td,
  Radio,
  WrapItem,
  Wrap,
  Textarea,
  RadioGroup,
} from "@chakra-ui/react";
import { ResponsiveCard } from "components/ResponsiveCard";
import Loader from "components/Loader";
import PageBreadcrumb from "components/PageBreadcrumb";
import {
  MatchFeedback,
  MenteeMatchFeedback,
  MentorMatchFeedback,
  MentorMatchFeedbackChoice,
  mentorMatchFeedbackChoices,
  zMenteeMatchFeedback,
  zMentorMatchFeedback,
} from "shared/MatchFeedback";
import { compareDate } from "shared/strings/compareDate";
import { prettifyDate } from "shared/strings/prettifyDate";
import { sectionSpacing } from "theme/metrics";
import trpc, { trpcNext } from "trpc";
import invariant from "shared/invariant";
import { z } from "zod";
import { MenteeLink, UserLink } from "components/UserChip";
import { SmallGrayText } from "components/SmallGrayText";
import { ReactNode, useEffect, useState } from "react";
import Autosaver from "components/Autosaver";
import moment from "moment";
import { actionRequiredTextColor } from "theme/colors";
const title = "初次交流反馈";
export default function Page() {
  const { data } = trpcNext.matchFeedback.list.useQuery();
  const {
    editable,
    until,
    isLoading: isLoadingEditable,
  } = useMatchFeedbackEditableUntil();
  const [editableFeedback, setEditableFeedback] = useState<MatchFeedback>();
  useEffect(() => {
    // Do not set editable if it is already set, so new data does not override
    // it when reloaded. It can happen if, say, the user switches browser pages.
    if (editableFeedback) return;
    if (!isLoadingEditable && editable && data && data.length > 0) {
      setEditableFeedback(data[0].feedback);
    }
  }, [editableFeedback, data, isLoadingEditable, editable]);
  const save = async (data: MatchFeedback) => {
    await trpc.matchFeedback.updateLast.mutate(data);
  };
  return (
    <>
      <PageBreadcrumb current={title} />

      <VStack align="start" spacing={sectionSpacing} w="full">
        {!data || isLoadingEditable ? (
          <Loader />
        ) : data.length === 0 ? (
          <Text>
            <T>没有需要填写的反馈表。</T>
          </Text>
        ) : (
          data
            // Place the latest feedback at the top
            .sort((a, b) => compareDate(b.createdAt, a.createdAt))
            .map((fnc, idx) => {
              const f =
                idx == 0 && editableFeedback ? editableFeedback : fnc.feedback;
              const update =
                idx == 0 && editableFeedback ? setEditableFeedback : undefined;
              return (
                <>
                  {idx == 0 && !editable && (
                    <Text>
                      <T>反馈表已于</T> {until}
                      <T>关闭。</T>
                    </Text>
                  )}

                  {idx == 1 && (
                    <Heading size="md" my={sectionSpacing}>
                      <T>历史记录</T>
                    </Heading>
                  )}

                  {f.type == "Mentee" ? (
                    <MenteeFeedback
                      f={f as MenteeMatchFeedback}
                      update={update}
                    />
                  ) : (
                    <MentorFeedback
                      f={f as MentorMatchFeedback}
                      update={update}
                    />
                  )}
                </>
              );
            })
        )}
      </VStack>

      {editableFeedback && <Autosaver data={editableFeedback} onSave={save} />}
    </>
  );
}
Page.title = title;
type FeedbackOnMentor = z.infer<
  typeof zMenteeMatchFeedback.shape.mentors.element
>;
function LargeTh({ children }: { children: ReactNode }) {
  return <Th fontSize="md">{children}</Th>;
}
function useMatchFeedbackEditableUntil() {
  const { data, isLoading } = trpcNext.globalConfigs.get.useQuery();
  const editable =
    data?.matchFeedbackEditableUntil !== undefined &&
    moment(data.matchFeedbackEditableUntil).isAfter(moment());
  const until =
    data?.matchFeedbackEditableUntil &&
    prettifyDate(data.matchFeedbackEditableUntil);
  return {
    editable,
    until,
    isLoading,
  };
}
function FeedbackCard({
  editable,
  children,
}: {
  editable: boolean;
  children: ReactNode;
}) {
  const { until } = useMatchFeedbackEditableUntil();
  return (
    <ResponsiveCard w="full">
      <CardBody>
        <VStack align="start" spacing={sectionSpacing} w="full">
          {!editable && children}

          {editable && (
            <>
              <Text>
                {until && (
                  <>
                    <T>⚠️ 反馈表将于</T>{" "}
                    <Text
                      color={actionRequiredTextColor}
                      fontWeight="bold"
                      as="span"
                    >
                      {until}
                    </Text>{" "}
                    <T>自动关闭，请务必在此前完成反馈。</T>
                  </>
                )}
                建议在每次交流后第一时间内记录感受。反馈信息可以反复修改和补充。
              </Text>

              {children}

              <SmallGrayText>
                <T>系统会自动保存填写的内容。</T>
              </SmallGrayText>
            </>
          )}
        </VStack>
      </CardBody>
    </ResponsiveCard>
  );
}
function MenteeFeedback({
  f,
  update,
}: {
  f: MenteeMatchFeedback;
  update?: (f: MatchFeedback) => void;
}) {
  const updateRow = (fom: FeedbackOnMentor) => {
    invariant(update, "expect update()");

    // Here we maintain the order of the original list so the UI stays stable.
    const updated: FeedbackOnMentor[] = [];
    for (const m of f.mentors) {
      if (m.id == fom.id) updated.push(fom);
      else updated.push(m);
    }
    update({
      ...f,
      mentors: updated,
    });
  };
  invariant(f.type == "Mentee", "expect Mentee feedback");
  return (
    <FeedbackCard editable={!!update}>
      {update && (
        <>
          <Text>
            <b>
              <T>务必跟随心里最真实的想法打分</T>
            </b>
            <T>，打分会直接影响匹配结果。</T>
          </Text>
          <Text>
            <b>
              <T>无须担心隐私</T>
            </b>
            ：导师无法看到你的反馈，所有反馈数据将由中立的专员统一分析，请放心填写。
          </Text>
        </>
      )}
      <TableContainer w="full">
        <Table variant="unstyled">
          <Thead>
            <Tr>
              <LargeTh>
                <T>导师</T>
              </LargeTh>
              <LargeTh>
                <T>打分</T>
                <br />
                <Text as="span" fontSize="xs">
                  <T>1：不想匹配</T>
                  <br />
                  <T>5：很想匹配</T>
                </Text>
              </LargeTh>
              <LargeTh>
                <T>打分的原因</T>
              </LargeTh>
            </Tr>
          </Thead>
          <Tbody>
            {f.mentors.map((f, idx) => (
              <MenteeFeedbackRow
                key={idx}
                f={f}
                {...(update
                  ? {
                      update: updateRow,
                    }
                  : {})}
              />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </FeedbackCard>
  );
}
function MenteeFeedbackRow({
  f,
  update,
}: {
  f: FeedbackOnMentor;
  update?: (f: FeedbackOnMentor) => void;
}) {
  invariant(f.user, "expect user");
  return (
    <Tr>
      <Td>
        <UserLink user={f.user} />
      </Td>
      <Td>
        <RadioGroup
          value={f.score?.toString() ?? "0"}
          onChange={(score) =>
            update
              ? update({
                  ...f,
                  score: parseInt(score),
                })
              : undefined
          }
        >
          <Wrap>
            {[1, 2, 3, 4, 5].map((score) => (
              <WrapItem key={score}>
                <Radio value={score.toString()} isReadOnly={!update}>
                  {score}
                </Radio>
              </WrapItem>
            ))}
          </Wrap>
        </RadioGroup>
      </Td>
      <Td>
        <Textarea
          value={f.reason ?? ""}
          isReadOnly={!update}
          // Ensure good look on mobile
          minW="300px"
          onChange={(e) =>
            update
              ? update({
                  ...f,
                  reason: e.target.value,
                })
              : undefined
          }
        />
      </Td>
    </Tr>
  );
}
type FeedbackOnMentee = z.infer<
  typeof zMentorMatchFeedback.shape.mentees.element
>;
function MentorFeedback({
  f,
  update,
}: {
  f: MentorMatchFeedback;
  update?: (f: MatchFeedback) => void;
}) {
  const updateRow = (fom: FeedbackOnMentee) => {
    invariant(update, "expect update()");

    // Here we maintain the order of the original list so the UI stays stable.
    const updated: FeedbackOnMentee[] = [];
    for (const m of f.mentees) {
      if (m.id == fom.id) updated.push(fom);
      else updated.push(m);
    }
    update({
      ...f,
      mentees: updated,
    });
  };
  invariant(f.type == "Mentor", "expect Mentor feedback");
  return (
    <FeedbackCard editable={!!update}>
      <TableContainer w="full">
        <Table variant="unstyled">
          <Thead>
            <Tr>
              <LargeTh>
                <T>学生</T>
              </LargeTh>
              <LargeTh>
                <T>评价</T>
              </LargeTh>
              <LargeTh>
                <T>如果是“特别喜欢”，原因是什么？</T>
              </LargeTh>
            </Tr>
          </Thead>
          <Tbody>
            {f.mentees.map((f, idx) => (
              <MentorFeedbackRow
                key={idx}
                f={f}
                {...(update
                  ? {
                      update: updateRow,
                    }
                  : {})}
              />
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </FeedbackCard>
  );
}
function MentorFeedbackRow({
  f,
  update,
}: {
  f: FeedbackOnMentee;
  update?: (f: FeedbackOnMentee) => void;
}) {
  invariant(f.user, "expect user");
  return (
    <Tr>
      <Td>
        <MenteeLink user={f.user} />
      </Td>
      <Td>
        <RadioGroup
          value={f.choice ?? ""}
          onChange={(choice) =>
            update
              ? update({
                  ...f,
                  choice: choice as MentorMatchFeedbackChoice,
                })
              : undefined
          }
        >
          <Wrap>
            {mentorMatchFeedbackChoices.map((choice) => (
              <WrapItem key={choice}>
                <Radio value={choice} isReadOnly={!update}>
                  {choice == "Prefer"
                    ? "特别喜欢"
                    : choice == "Avoid"
                      ? "希望避免"
                      : "都不是"}
                </Radio>
              </WrapItem>
            ))}
          </Wrap>
        </RadioGroup>
      </Td>
      <Td>
        <Textarea
          value={f.reason ?? ""}
          isReadOnly={!update}
          // Ensure good look on mobile
          minW="300px"
          onChange={(e) =>
            update
              ? update({
                  ...f,
                  reason: e.target.value,
                })
              : undefined
          }
        />
      </Td>
    </Tr>
  );
}
export const getStaticProps = getI18nProps;
