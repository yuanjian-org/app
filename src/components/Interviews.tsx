import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  TableContainer,
  WrapItem,
  Wrap,
  Text,
  HStack,
  Td,
  Link,
} from "@chakra-ui/react";
import Loader from "components/Loader";
import { formatUserName } from "shared/strings/formatUserName";
import { compareUUID } from "shared/strings/compareUUID";
import { toPinyin } from "shared/strings/toPinyin";
import { Interview } from "shared/Interview";
import { CheckIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { sectionSpacing } from "theme/metrics";
import {
  EditorFeedback,
  EditorFeedbackDimension,
  summaryDimensionName,
  summaryScoreLabels,
  getScoreColor,
} from "./InterviewEditor";
import { CircleIcon } from "./CircleIcon";
import { isPermitted } from "shared/Role";
import { MenteeStatusSelectCell } from "./MenteeStatusSelect";
import trpc, { trpcNext } from "trpc";
import { MenteeStatus } from "shared/MenteeStatus";
import invariant from "tiny-invariant";
import TdLink from "./TdLink";
import {
  PointOfContactHeaderCells,
  PointOfContactCells,
} from "./pointOfContactCells";
import { MenteeSourceHeaderCell, MenteeSourceCell } from "./MenteeSourceCell";
import { menteeSourceField } from "shared/applicationFields";
import { useMyId, useMyRoles } from "useMe";
import TruncatedTextWithTooltip from "./TruncatedTextWithTooltip";
import T from "components/T";

/**
 * @param forCalibration when true, show additional columns in the table and
 * link to `/interviews/<id>` as opposed to `/interviews/<id>/feedback`.
 *
 * TODO: Refactor to remove the `forCalibration` flag.
 */
export default function Interviews({
  interviews,
  forCalibration,
  hideTotalCount = false,
}: {
  interviews: Interview[] | undefined;
  forCalibration: boolean;
  hideTotalCount?: boolean;
}) {
  const myRoles = useMyRoles();

  // Show interviewee statuses only to MentorshipAdmins
  const showStatus = forCalibration && isPermitted(myRoles, "MentorshipAdmin");

  return !interviews ? (
    <Loader />
  ) : (
    <TableContainer>
      <Table size={forCalibration ? "sm" : "md"}>
        <Thead>
          <Tr>
            {showStatus && (
              <Th>
                <T>状态</T>
              </Th>
            )}
            <PointOfContactHeaderCells />
            <MenteeSourceHeaderCell />
            <Th>
              <T>候选人</T>
            </Th>
            <Th>
              {forCalibration ? "" : "其他"}
              <T>面试官</T>
            </Th>
            {forCalibration && (
              <>
                <Th>
                  <T>讨论结果</T>
                </Th>
                <Th>
                  <T>讨论备注</T>
                </Th>
                <Th>
                  <T>拼音（便于查找）</T>
                </Th>
              </>
            )}
          </Tr>
        </Thead>
        <Tbody>
          {interviews
            // Fix dislay order
            .sort((i1, i2) => compareUUID(i1.id, i2.id))
            .map((i) => (
              <InterviewRow
                i={i}
                key={i.id}
                forCalibration={forCalibration}
                showStatus={showStatus}
              />
            ))}
        </Tbody>
      </Table>

      {!hideTotalCount && (
        <Text fontSize="sm" color="gray" marginTop={sectionSpacing}>
          <T>共</T> <b>{interviews.length}</b> <T>名</T>
        </Text>
      )}

      <Text marginTop={sectionSpacing} color="gray" fontSize="sm">
        <CheckIcon /> <T>表示已经填写了面试反馈的面试官。</T>
      </Text>
    </TableContainer>
  );
}

function InterviewRow({
  i,
  forCalibration,
  showStatus,
}: {
  i: Interview;
  forCalibration: boolean;
  showStatus: boolean;
}) {
  const myId = useMyId();
  const { data: app, refetch } = trpcNext.users.getApplicant.useQuery({
    userId: i.interviewee.id,
    type: i.type,
  });
  const source = (app?.application as Record<string, any> | null)?.[
    menteeSourceField
  ];

  const saveMenteeStatus = async (status: MenteeStatus | null | undefined) => {
    invariant(status !== undefined);
    await trpc.users.setMenteeStatus.mutate({
      userId: i.interviewee.id,
      menteeStatus: status,
    });
    void refetch();
  };

  const url = forCalibration
    ? `/interviews/${i.id}`
    : `/interviews/${i.id}/feedback`;

  return (
    <Tr key={i.id} _hover={{ bg: "white" }}>
      {showStatus &&
        app &&
        (i.type !== "MenteeInterview" ? (
          <Td></Td>
        ) : (
          <MenteeStatusSelectCell
            status={app.user.menteeStatus}
            onChange={saveMenteeStatus}
          />
        ))}

      {app && app.user && (
        <PointOfContactCells user={app.user} refetch={refetch} />
      )}

      <MenteeSourceCell source={source} />

      <TdLink href={url}>
        <Link>
          <b>{formatUserName(i.interviewee.name)}</b>
          <ChevronRightIcon />
        </Link>
      </TdLink>

      <TdLink href={url}>
        <Wrap spacing="2">
          {i.feedbacks
            .filter((f) => forCalibration || f.interviewer.id !== myId)
            .map((f) => (
              <WrapItem key={f.id}>
                {formatUserName(f.interviewer.name)}
                {f.feedbackUpdatedAt && <CheckIcon marginStart={1} />}
              </WrapItem>
            ))}
        </Wrap>
      </TdLink>

      {forCalibration && (
        <>
          <TdLink href={url}>
            <DecisionScore interview={i} />
          </TdLink>
          <TdLink href={url}>
            <DecisionComment interview={i} />
          </TdLink>
        </>
      )}

      {forCalibration && (
        <TdLink href={url} translate="no" className="notranslate">
          {toPinyin(i.interviewee.name ?? "")},{" "}
          {i.feedbacks
            .filter((f) => forCalibration || f.interviewer.id !== myId)
            .map((f) => toPinyin(f.interviewer.name ?? ""))
            .join(", ")}
        </TdLink>
      )}
    </Tr>
  );
}

function DecisionScore({ interview }: { interview: Interview }) {
  const d = getDimension(interview);
  return d?.score ? (
    <HStack gap={2}>
      <CircleIcon color={getScoreColor(summaryScoreLabels, d.score)} />
      <Text>{summaryScoreLabels[d.score - 1]}</Text>
    </HStack>
  ) : (
    <></>
  );
}

function DecisionComment({ interview }: { interview: Interview }) {
  const d = getDimension(interview);
  return d?.comment ? <TruncatedTextWithTooltip text={d.comment} /> : <></>;
}

function getDimension(i: Interview): EditorFeedbackDimension | null {
  if (!i.decision) return null;
  for (const d of (i.decision as EditorFeedback).dimensions) {
    if (d.name == summaryDimensionName) return d;
  }
  return null;
}
