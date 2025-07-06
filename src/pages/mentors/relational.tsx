import {
  Text,
  VStack,
  UnorderedList,
  ListItem,
  Link,
  OrderedList,
  Heading,
  Box,
  Wrap,
  Button,
  HStack,
  Stack,
  WrapItem,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  MenuList,
  Menu,
  MenuItem,
  MenuButton,
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { trpcNext } from "trpc";
import {
  breakpoint,
  componentSpacing,
  pageMarginX,
  sectionSpacing,
  maxTextWidth,
} from "theme/metrics";
import UserCards, { FullTextSearchBox } from "components/UserCards";
import { UserDisplayData } from "../../components/UserPanel";
import { dailyShuffle } from "pages/mentors";
import { TraitsModal } from "components/Traits";
import { hardMismatchScore, isTraitsComplete } from "shared/Traits";
import { computeTraitsMatchingScore } from "shared/Traits";
import { UserProfile } from "shared/UserProfile";
import Loader from "components/Loader";
import { useMyId } from "useMe";
import TopBar, { topBarPaddings } from "components/TopBar";
import { fullPage } from "AppPage";
import { SmallGrayText } from "components/SmallGrayText";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import { toChineseNumber } from "shared/strings";
import { ArrowForwardIcon, ChevronDownIcon } from "@chakra-ui/icons";
import NextLink from "next/link";

export const minSelectedMentors = 5;

export default fullPage(() => {
  const myId = useMyId();

  const { data } = trpcNext.users.listMentors.useQuery();
  const [profile, setProfile] = useState<UserProfile>();
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: applicant } = trpcNext.users.getApplicant.useQuery({
    type: "MenteeInterview",
    userId: myId,
  });

  const { data: selections } = trpcNext.mentorSelections.listDrafts.useQuery();
  const selected = selections?.length ?? 0;

  const shuffled = useMemo(() => {
    if (!profile || !data || !applicant) return undefined;

    const filtered: UserDisplayData[] = data
      .filter((m) => m.relational)
      .map((m) => {
        const { score } = computeTraitsMatchingScore(
          profile,
          applicant.application,
          m.traitsPreference,
        );
        console.log("traitsMatchingScore", m.user.name, score);
        return {
          ...m,
          traitsMatchingScore: score,
        };
      })
      // Filter out hard mismatching mentors
      .filter((m) => m.traitsMatchingScore !== hardMismatchScore);

    const compare = (a: UserDisplayData, b: UserDisplayData) => {
      return (b.traitsMatchingScore ?? 0) - (a.traitsMatchingScore ?? 0);
    };
    return dailyShuffle(filtered, myId, compare);
  }, [data, myId, profile, applicant]);

  return (
    <>
      <TopBar>
        <VStack align="start">
          <Stack
            w="full"
            justify="space-between"
            align={{ base: "start", [breakpoint]: "center" }}
            direction={{ base: "column", [breakpoint]: "row" }}
            spacing={componentSpacing}
            {...topBarPaddings()}
          >
            <FullTextSearchBox
              value={searchTerm}
              setValue={setSearchTerm}
              narrow
            />

            {selected < minSelectedMentors ? (
              <Heading size="md">
                请选择至少{toChineseNumber(minSelectedMentors)}位导师
                <Text
                  display="inline"
                  color={selected === 0 ? "gray" : "green.600"}
                >
                  （
                  {selected === 0
                    ? "尚未选择"
                    : `已选${toChineseNumber(selected)}位`}
                  ）
                </Text>
              </Heading>
            ) : (
              <Wrap
                spacing={componentSpacing}
                align="center"
                // Flashing animation to grab attention
                animation="flash 1s ease-in-out infinite"
                sx={{
                  "@keyframes flash": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.1 },
                  },
                }}
              >
                <WrapItem>
                  <Heading size="md">
                    选择更多导师，或者
                    <ArrowForwardIcon ms={2} />
                  </Heading>
                </WrapItem>
                <WrapItem>
                  <Button
                    variant="brand"
                    as={NextLink}
                    href="/mentors/relational/sort"
                  >
                    完成选择
                  </Button>
                </WrapItem>
              </Wrap>
            )}

            <HStack spacing={2}>
              <InstructionsLinkAndModal />

              <Text color="gray">|</Text>

              <Menu>
                <MenuButton as={Link}>
                  更多功能 <ChevronDownIcon />
                </MenuButton>
                <MenuList>
                  <TraitsMenuItemAndModal setProfile={setProfile} />
                  <MenuItem as={NextLink} href="/mentors/relational/history">
                    导师选择历史
                  </MenuItem>
                  <MenuItem as={NextLink} href="/match/feedback">
                    初次交流反馈
                  </MenuItem>
                </MenuList>
              </Menu>
            </HStack>
          </Stack>

          <Box w="full" bg="orange.50" py={2} px={4}>
            <SmallGrayText>
              ⭐
              是匹配偏好与你的个人特质比较相近的导师。推荐仅供参考，选择权在你。
            </SmallGrayText>
          </Box>
        </VStack>
      </TopBar>

      {!shuffled ? (
        <Loader alignSelf="flex-start" />
      ) : (
        <UserCards
          type="RelationalMentor"
          users={shuffled}
          mentorSelections={selections}
          searchTerm={searchTerm}
          mx={pageMarginX}
          mt={pageMarginX}
        />
      )}
    </>
  );
}, "选择一对一导师");

function InstructionsLinkAndModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Link onClick={() => setIsModalOpen(true)}>如何选择导师</Link>

      {isModalOpen && <InstructionsModal close={() => setIsModalOpen(false)} />}
    </>
  );
}

function InstructionsModal({ close }: { close: () => void }) {
  return (
    <ModalWithBackdrop
      size="xl"
      isOpen
      onClose={close}
      // To make sure user doesn't miss important content inside the modal.
      scrollBehavior="outside"
    >
      <ModalContent>
        <ModalHeader>如何选择一对一导师</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack
            spacing={componentSpacing}
            mb={sectionSpacing}
            align="start"
            maxW={maxTextWidth}
          >
            <Text>
              在浏览导师信息之前，我们希望向你传达社会导师的意义与目标，以便你做出更好的选择：
            </Text>
            <UnorderedList>
              <ListItem>
                首先，一对一导师将提供长期的陪伴与指导，在帮助你顺利度过校园时光的同时，为将来步入职场和社会做好准备，我们期待能够助力年轻人实现理想并承担社会责任。
              </ListItem>
              <ListItem>
                其次，一对一导师是传统教育的有效补充，我们聚焦于提高综合素养及软实力、而非提供专业学科知识。在定期交流中，你可与导师展开一系列广泛的交流，如生活与学习、爱好与情感、理想与未来、科技与社会发展、或其他任何你感兴趣的话题。
              </ListItem>
              <ListItem>
                最后，一对一导师期待与你建立好友般亲密、平等、互信的关系、而非传统的师生模式，导师将与你并肩前行和成长。
              </ListItem>
            </UnorderedList>

            <Text>基于以上内容，我们建议你选择时：</Text>
            <OrderedList>
              <ListItem>
                <b>请用“交朋友”的心态选择导师</b>
                ，关注导师的成长背景、兴趣爱好、沟通风格等信息；
              </ListItem>
              <ListItem>
                避免将“专业对口”作为主要标准。非同专业的导师往往能够为你提供更广阔的视角和多元的思维方式，有益于延伸个人发展可能性；
              </ListItem>
              <ListItem>
                无须担心在匹配完一对一导师后失去与其他导师沟通的机会，你随时可通过
                <Link href="/mentors" target="_blank">
                  预约不定期导师
                </Link>
                获得与社区内其他导师交流的机会。
              </ListItem>
            </OrderedList>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="brand" onClick={close}>
            知道了
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

function TraitsMenuItemAndModal({
  setProfile,
}: {
  setProfile: (profile: UserProfile) => void;
}) {
  const { data, refetch } = trpcNext.users.getUserProfile.useQuery({
    userId: useMyId(),
  });

  const [state, setState] = useState<null | "instructions" | "traits">(null);

  useEffect(() => {
    if (!data) return;
    const t = data?.profile?.特质;
    if (t && isTraitsComplete(t)) {
      setProfile(data.profile);
    } else {
      setState("instructions");
    }
  }, [data, setProfile]);

  return (
    <>
      <MenuItem onClick={() => setState("traits")}>个人特质</MenuItem>

      {state === "instructions" && (
        <InstructionsModal
          close={() => {
            setState("traits");
          }}
        />
      )}

      {state === "traits" && (
        <TraitsModal
          onClose={() => {
            setState(null);
            // Refetch to make sure all fields are present. See useEffect above.
            void refetch();
          }}
        />
      )}
    </>
  );
}
