import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  DrawerHeader,
} from "@chakra-ui/react";
import UserPanel, { UserPanelProps } from "components/UserPanel";

export default function UserDrawer({
  onClose,
  ...rest
}: UserPanelProps & {
  onClose: () => void;
}) {
  return (
    <Drawer size="xl" isOpen onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton size="lg" />
        <DrawerHeader />
        <DrawerBody>
          {/**
           * TODO: Popover is displayed behind the user drawer.
           * cf. https://github.com/chakra-ui/chakra-ui/discussions/5974 */}
          <UserPanel {...rest} hideKudosControl={true} />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
