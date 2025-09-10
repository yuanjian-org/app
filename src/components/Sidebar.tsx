/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import React from "react";
import { signOut, useSession } from "next-auth/react";
import { FiChevronRight } from "react-icons/fi";
import { IoIosCog, IoMdCalendar } from "react-icons/io";
import { IoStar } from "react-icons/io5";
import {
  Avatar,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Box,
  Flex,
  Icon,
  Link,
  Text,
  Divider,
  DrawerContent,
  Drawer,
  DrawerCloseButton,
  DrawerOverlay,
} from "@chakra-ui/react";
import NextLink from "next/link";
import useMe, { useMyRoles } from "useMe";
import { isPermitted } from "shared/Role";
import { useRouter } from "next/router";
import { trpcNext } from "trpc";
import { Mentorship } from "shared/Mentorship";
import {
  MdChevronRight,
  MdFace,
  MdSupervisorAccount,
  MdMic,
  MdHome,
} from "react-icons/md";
import Role from "../shared/Role";
import { compareChinese, compareDate, formatUserName } from "shared/strings";
import { AttachmentIcon } from "@chakra-ui/icons";
import { componentSpacing } from "theme/metrics";
import colors, { activeNavLinkColor, inactiveNavLinkColor } from "theme/colors";
import { staticUrlPrefix } from "static";
import User, { isAcceptedMentee } from "shared/User";
import { mentorshipStatusIconType } from "pages/mentees";
import { ImpersonationRequest } from "pages/api/auth/[...nextauth]";
import { accountPageTitle } from "pages/accounts/[userId]";
import { UnreadKudosRedDot } from "./Kudos";
import { UnreadChatMessagesRedDot } from "./ChatRoom";
import { FaStreetView } from "react-icons/fa";
import { UnreadTasksRedDot } from "./launchpad/TasksCard";
import { RiCustomerServiceFill } from "react-icons/ri";

export const desktopSidebarWidth = "240px";
export const sidebarContentMarginTop = 10;
export const sideBarBorderColor = "gray.200";
const sidebarItemPaddingY = 4;
const sidebarItemPaddingLeft = 8;

interface MainMenuItem {
  name: string;
  icon: React.ComponentType;
  iconColor?: string;
  path: string;
  regex?: RegExp;
  permission?: Role | Role[] | ((u: User) => boolean);
  redDot?: React.ComponentType;
}

interface DropdownMenuItem {
  name: string;
  // string url as the href attribute and function as the onClick handler.
  action: (() => void) | string;
  // valid only if action is a string.
  target?: "_blank";
  roles?: Role | Role[];
  icon?: React.ReactNode;
}

const managerDropdownMenuItems: DropdownMenuItem[] = [
  {
    name: "学生面试",
    action: "/interviews?type=MenteeInterview",
    roles: "MentorshipManager",
  },
  {
    name: "导师面试",
    action: "/interviews?type=MentorInterview",
    roles: "MentorshipManager",
  },
  {
    name: "面试官",
    action: "/interviewers",
    roles: "MentorshipManager",
  },
  {
    name: "导师",
    action: "/mentors/manage",
    roles: ["MentorshipManager", "MentorshipOperator"],
  },
  {
    name: "会议",
    action: "/groups",
    roles: "GroupManager",
  },
  {
    name: "用户",
    action: "/users",
    roles: "UserManager",
  },
  {
    name: "一对一匹配",
    action: "/match",
    roles: "MentorshipManager",
  },
  {
    name: "一对一通话时间",
    action: "/schedules",
    roles: "MentorshipManager",
  },
  {
    name: "不定期导师预约记录",
    action: "/mentors/bookings",
    roles: ["MentorshipManager", "MentorshipOperator"],
  },
  {
    name: "已删除纪要文字",
    action: "/deleted",
    roles: "MentorshipManager",
  },
  {
    name: "全局设置",
    action: "/global",
    roles: "MentorshipManager",
  },
];

const userDropdownMenuItems: DropdownMenuItem[] = [
  {
    name: "个人资料",
    action: "/profiles/me",
  },
  {
    name: "偏好设置",
    action: "/preferences/me",
  },
  {
    name: accountPageTitle,
    action: "/accounts/me",
  },
  {
    icon: <RiCustomerServiceFill />,
    name: "联系客服",
    action: "https://work.weixin.qq.com/kfid/kfcd32727f0d352531e",
    target: "_blank",
  },
  {
    name: "退出登录",
    action: () => signOut({ callbackUrl: staticUrlPrefix }),
  },
];

const mainMenuItems: MainMenuItem[] = [
  {
    name: "首页",
    path: staticUrlPrefix,
    icon: MdHome,
    iconColor: colors.brand.b,
  },
  {
    name: "个人空间",
    path: "/",
    icon: FaStreetView,
    // match "/" and "/groups/.*"
    regex: /^\/$|\/groups\/.*/,
    redDot: UnreadTasksRedDot,
  },
  {
    name: "我的面试",
    path: "/interviews/mine",
    icon: MdMic,
    regex: /^\/interviews\/mine/,
    permission: "Interviewer",
  },

  {
    name: "预约不定期导师",
    path: "/mentors",
    icon: IoMdCalendar,
    regex: /^\/mentors$/,
    permission: (me: User) =>
      isAcceptedMentee(me.roles, me.menteeStatus, true) ||
      isPermitted(me.roles, ["Mentor", "MentorshipOperator"]),
  },
  {
    name: "选择一对一导师",
    path: "/mentors/relational",
    icon: MdSupervisorAccount,
    regex: /^\/mentors\/relational.*/,
    permission: (me: User) =>
      isAcceptedMentee(me.roles, me.menteeStatus) ||
      isPermitted(me.roles, ["Mentor", "MentorshipOperator"]),
  },
  {
    name: "志愿者档案",
    path: "/volunteers",
    icon: IoStar,
    regex: /^\/volunteers/,
    permission: "Volunteer",
    redDot: UnreadKudosRedDot,
  },
  {
    name: "学生档案",
    path: "/mentees?menteeStatus=现届学子",
    icon: AttachmentIcon,
    regex: /^\/mentees[^/]/,
    permission: ["MentorshipManager", "MentorshipOperator"],
  },
];

function mentorships2Items(
  mentorships: Mentorship[] | undefined,
): MainMenuItem[] {
  if (!mentorships) return [];

  mentorships.sort((a, b) => {
    const aEnded = isMentorshipEnded(a);
    const bEnded = isMentorshipEnded(b);
    if (aEnded !== bEnded) {
      // ended ones should be sorted after ongoing ones.
      return aEnded ? 1 : -1;
    } else if (a.transactional !== b.transactional) {
      // transactional should be sorted after relational.
      return a.transactional ? 1 : -1;
    } else {
      return compareChinese(a.mentee.name, b.mentee.name);
    }
  });

  return mentorships.map((m) => {
    const icon = mentorshipStatusIconType(m);
    return {
      name: formatUserName(m.mentee.name),
      icon: icon ?? MdFace,
      path: `/mentees/${m.mentee.id}`,
      regex: new RegExp(`^\/mentees\/${m.mentee.id}`),
      redDot: showRedDotForMentorship(m)
        ? () => <UnreadChatMessagesRedDot menteeId={m.mentee.id} />
        : undefined,
    };
  });
}

export function showRedDotForMentorship(m: Mentorship) {
  return !m.transactional && !isMentorshipEnded(m);
}

function isMentorshipEnded(m: Mentorship) {
  return m.endsAt !== null && compareDate(m.endsAt, new Date()) < 0;
}

export function useMyMentorshipsAsMentor() {
  const myRoles = useMyRoles();
  const { data } = trpcNext.mentorships.listMyMentorships.useQuery(
    {
      as: "Mentor",
    },
    {
      enabled: isPermitted(myRoles, "Mentor"),
    },
  );
  return data ?? [];
}

export function SidebarForDesktop() {
  return (
    <Box
      bg="white"
      borderRight="1px"
      borderRightColor={sideBarBorderColor}
      w={desktopSidebarWidth}
      pos="fixed"
      h="full"
      // Setting pos to fixed creates a new stacking context,
      // which might cause the element to render beneath others (dropdown) menu.
      // Solved it by setting a lower ZIndex to it.
      zIndex="1"
    >
      <SidebarContent onClose={() => undefined} />
    </Box>
  );
}

export function SidebarForMobile({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Drawer
      returnFocusOnClose={false}
      placement="left"
      isOpen={isOpen}
      onClose={onClose}
      onOverlayClick={onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <SidebarContent onClose={onClose} />
      </DrawerContent>
    </Drawer>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  const me = useMe();
  const mentorships = useMyMentorshipsAsMentor();
  const mentorshipItems = mentorships2Items(mentorships);
  const myName = formatUserName(me.name);

  return (
    <Flex
      direction="column"
      justifyContent="space-between"
      // Enable scrolling.
      overflowY="auto"
      h="full"
    >
      <Box>
        <ImpersonationBanner />

        {/* White spacing */}
        <Box height={sidebarContentMarginTop - sidebarItemPaddingY} />

        {mainMenuItems
          .filter((item) =>
            typeof item.permission === "function"
              ? item.permission(me)
              : isPermitted(me.roles, item.permission),
          )
          .map((item) => (
            <SidebarRow key={item.path} item={item} onClose={onClose} />
          ))}

        <DropdownMenuIfPermitted
          title="管理功能"
          icon={<Icon as={IoIosCog} marginRight="2" />}
          menuItems={managerDropdownMenuItems}
          onClose={onClose}
        />

        {mentorshipItems?.length > 0 && <Divider marginY={2} />}
        {mentorshipItems.map((item) => (
          <SidebarRow key={item.path} item={item} onClose={onClose} />
        ))}
      </Box>

      <Box>
        <DropdownMenuIfPermitted
          title={myName}
          icon={<Avatar size={"sm"} bg="brand.a" color="white" name={myName} />}
          menuItems={userDropdownMenuItems}
          onClose={onClose}
        />
      </Box>
    </Flex>
  );
}

function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();

  const stopImpersonation = async () => {
    const req: ImpersonationRequest = { impersonate: null };
    await update(req);
    await router.push("/users");
  };

  return !session?.impersonated ? (
    <></>
  ) : (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="orange.100"
      color="orange.800"
      py={2}
      px={4}
      fontSize="sm"
    >
      <Text>假扮模式</Text>
      <Link
        ml={2}
        color="orange.600"
        textDecoration="underline"
        onClick={stopImpersonation}
      >
        退出
      </Link>
    </Box>
  );
}

function DropdownMenuIfPermitted({
  title,
  icon,
  menuItems,
  onClose,
}: {
  title: string;
  icon: React.ReactNode;
  menuItems: DropdownMenuItem[];
  onClose: () => void;
}) {
  const myRoles = useMyRoles();
  const filteredItems = menuItems.filter((item) =>
    isPermitted(myRoles, item.roles),
  );

  if (filteredItems.length === 0) {
    return <></>;
  }
  return (
    <Flex paddingY={sidebarItemPaddingY}>
      <Menu placement="right-start">
        <DropdownMenuButton title={title} icon={icon} />
        <MenuList bg="white" borderColor={sideBarBorderColor}>
          {filteredItems.map((item, index) => {
            const isUrl = typeof item.action === "string";
            return (
              <MenuItem
                key={index}
                // Only sets the link it is a url
                {...(isUrl && {
                  as: NextLink,
                  href: item.action,
                  target: item.target,
                })}
                onClick={() => {
                  if (!isUrl) (item.action as () => void)();
                  onClose();
                }}
              >
                {item.name}
                {!!item.icon && <>&nbsp;</>}
                {item.icon}
              </MenuItem>
            );
          })}
        </MenuList>
      </Menu>
    </Flex>
  );
}

const DropdownMenuButton = ({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) => {
  return (
    <MenuButton
      marginX={componentSpacing}
      paddingLeft={componentSpacing}
      color={inactiveNavLinkColor}
      fontWeight="medium"
      transition="all 0.3s"
      _focus={{ boxShadow: "none" }}
    >
      <HStack>
        {icon}
        <Text>{title}</Text>
        <FiChevronRight />
      </HStack>
    </MenuButton>
  );
};

function SidebarRow({
  item,
  onClose,
}: {
  item: MainMenuItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const active =
    item.regex &&
    (item.regex.test(router.pathname) || item.regex.test(router.asPath));

  return (
    <Link
      as={NextLink}
      href={item.path}
      color={active ? activeNavLinkColor : inactiveNavLinkColor}
      fontWeight={active ? "bold" : "medium"}
      onClick={onClose}
    >
      <Flex
        align="center"
        paddingLeft={sidebarItemPaddingLeft}
        paddingY={sidebarItemPaddingY}
        role="group"
        cursor={active ? "default" : "pointer"}
      >
        <Icon
          as={item.icon}
          {...(item.iconColor && { color: item.iconColor })}
        />
        <Text marginX={componentSpacing} position="relative">
          {item.name}
          {item.redDot && <item.redDot />}
        </Text>
        <Icon
          as={MdChevronRight}
          opacity={0}
          _groupHover={active ? {} : { opacity: 100 }}
        />
      </Flex>
    </Link>
  );
}
