import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  TouchSensor,
  DragEndEvent,
  MouseSensor
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button, Card, CardBody, Grid, GridItem, Heading, HStack, Link, ModalHeader, ModalContent, Spacer, Text, VStack,
  ModalBody,
  ModalFooter
} from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import trpc, { trpcNext } from "trpc";
import invariant from "tiny-invariant";
import { MentorSelection } from "shared/MentorSelection";
import Loader from "components/Loader";
import { formatUserName } from "shared/strings";
import { componentSpacing, maxTextWidth, sectionSpacing } from "theme/metrics";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { ChevronLeftIcon } from "@chakra-ui/icons";
import { MdDragIndicator } from "react-icons/md";
import { minSelectedMentors } from "../relational";
import ModalWithBackdrop from "components/ModalWithBackdrop";

export default function Page() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizable, setIsFinalizable] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  const finalize = async () => {
    setIsSaving(true);
    try {
      await trpc.mentorSelections.finalizeDraft.mutate();
      setIsFinalized(true);
    } finally {
      setIsSaving(false);
    }
  };

  return <>
    <PageBreadcrumb current="为导师排序" />

    <VStack maxW={maxTextWidth} spacing={sectionSpacing} align="stretch">
      <Text>
        请拖拽卡片进行排序，将最喜欢的导师放在顶部。越靠前的导师越有可能匹配：
      </Text>

      <Sorter setIsSaving={setIsSaving} setIsFinalizable={setIsFinalizable} />

      <HStack align="center">
        <Link as={NextLink} href="/mentors/relational">
           <ChevronLeftIcon me={1} /> 返回选择页面
        </Link>
        <Spacer />
        <Button
          variant="brand"
          isLoading={isSaving}
          onClick={finalize}
          isDisabled={!isFinalizable}
        >
          {isFinalizable ? "排好序了，完成选择" : "导师选择数量不足"}
        </Button>
      </HStack>
    </VStack>

    {isFinalized && <FinalizedModal close={() => {
      void router.push("/mentors/relational");
    }} />}
  </>;
}

function Sorter({ setIsSaving, setIsFinalizable }: { 
  setIsSaving: (v: boolean) => void,
  setIsFinalizable: (v: boolean) => void
}) {
  const { data } = trpcNext.mentorSelections.listDrafts.useQuery();
  const [sorted, setSorted] = useState<MentorSelection[]>();

  useEffect(() => {
    setSorted(data?.sort((a, b) => a.order - b.order));
    setIsFinalizable(!!data && data.length >= minSelectedMentors);
  }, [data, setIsFinalizable]);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    invariant(sorted);
    const oldIndex = sorted.findIndex(i => i.mentor.id === active.id);
    const newIndex = sorted.findIndex(i => i.mentor.id === over.id);
    const newSorted = arrayMove(sorted, oldIndex, newIndex);
    setSorted(newSorted);

    try {
      setIsSaving(true);
      await trpc.mentorSelections.reorderDraft.mutate(
        newSorted.map((s, i) => ({ mentorId: s.mentor.id, order: i })),
      );  
    } finally {
      setIsSaving(false);
    }  
  };

  return sorted === undefined ? <Loader /> : (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={sorted.map(i => i.mentor.id)}
        strategy={rectSortingStrategy}
      >
        <VStack align="stretch">
          {sorted.map((item, index) =>
            <SortableCard key={item.mentor.id} ms={item} currentOrder={index} />
          )}
        </VStack>
      </SortableContext>
    </DndContext>
  );
};

/**
 * Account for varying heights of cards:
 * Code: https://github.com/clauderic/dnd-kit/blob/e9215e820798459ae036896fce7fd9a6fe855772/stories/2%20-%20Presets/Sortable/1-Vertical.story.tsx#L85
 * Demo: https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-vertical--variable-heights
 */
const SortableCard = ({ ms, currentOrder }: {
  ms: MentorSelection,
  currentOrder: number
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: ms.mentor.id });

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      transform={CSS.Transform.toString(transform)}
      transition={transition}
      cursor="grab"
      boxShadow="sm"
    >
      <CardBody>
        <Grid templateColumns="1fr auto" gap={componentSpacing}>
          <GridItem>
            <Heading size="sm">
              {currentOrder + 1}. {formatUserName(ms.mentor.name, "formal")}
            </Heading>
            <Text color="gray" mt={componentSpacing}>{ms.reason}</Text>
          </GridItem>
          <GridItem display="flex" alignItems="center">
            <MdDragIndicator color="gray" size={24} />
          </GridItem>
        </Grid>
      </CardBody>
    </Card>
  );
};

function FinalizedModal({ close }: {
  close: () => void
}) {
  return <ModalWithBackdrop isOpen onClose={close}>
    <ModalContent>
      <ModalHeader>
        <Heading size="md">导师选择完成</Heading>
      </ModalHeader>
      <ModalBody>
        <Text>
          相关工作人员会尽快通知下一步流程，请耐心等待。
        </Text>
        <Text mt={componentSpacing}>
          你可以在页面右上角的“更多功能” → “查看选择历史”中查看选择历史。
        </Text>
      </ModalBody>
      <ModalFooter>
        <Button variant="brand" onClick={close}>知道了</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
