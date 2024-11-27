import {
  TableContainer,
  Table,
  Th,
  Td,
  Tr,
  Thead,
  Tbody,
} from '@chakra-ui/react';
import EditableWithIconOrLink from 'components/EditableWithIconOrLink';
import Loader from 'components/Loader';
import PageBreadcrumb from 'components/PageBreadcrumb';
import UserSelector from 'components/UserSelector';
import { MentorBooking } from 'shared/MentorBooking';
import { compareDate, formatUserName, prettifyDate } from 'shared/strings';
import trpc, { trpcNext } from "trpc";

export default function Page() {
  const { data, isLoading, refetch } = trpcNext.mentorBookings.list.useQuery();

  const assignMentor = async (mb: MentorBooking, userId: string) => {
    await trpc.mentorBookings.update.mutate({
      id: mb.id,
      notes: mb.notes,
      assignedMentorId: userId,
    });
    void refetch();
  };

  const saveNotes = async (mb: MentorBooking, notes: string) => {
    await trpc.mentorBookings.update.mutate({
      id: mb.id,
      notes: notes,
      assignedMentorId: mb.assignedMentor?.id ?? null,
    });
    void refetch();
  };

  return <>
    <PageBreadcrumb current='导师预约记录' />

    {isLoading ? <Loader /> : <TableContainer><Table>
      <Thead>
        <Tr>
          <Th>申请人</Th>
          <Th>主题</Th>
          <Th>指定导师</Th>
          <Th>分配导师</Th>
          <Th>申请日期</Th>
          <Th>备注</Th>
          <Th>备注人</Th>
        </Tr>
      </Thead>

      <Tbody>
        {data?.sort((a, b) => compareDate(a.createdAt, b.createdAt))
        .map(mb => <Tr key={mb.id}>
          <Td>{formatUserName(mb.requester.name, "formal")}</Td>

          <Td>{mb.topic}</Td>

          <Td>{mb.requestedMentor ?
            formatUserName(mb.requestedMentor.name, "formal") : "-"}
          </Td>

          <Td>
            <UserSelector
              onSelect={userIds => assignMentor(mb, userIds[0])}
              initialValue={mb.assignedMentor ? [mb.assignedMentor] : []}
            />
          </Td>

          <Td>{mb.createdAt && prettifyDate(mb.createdAt)}</Td>

          <Td>
            <EditableWithIconOrLink
              editor='input'
              decorator='icon'
              defaultValue={mb.notes ?? ""}
              onSubmit={notes => saveNotes(mb, notes)}
            />
          </Td>

          <Td>{mb.updater && formatUserName(mb.updater.name, "formal")}</Td>
        </Tr>)}
      </Tbody>
    </Table></TableContainer>}
  </>;
}

Page.title = "导师预约记录";
