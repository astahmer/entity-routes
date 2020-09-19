import { Drawer, DrawerBody, IconButton, useDisclosure, DrawerOverlay, DrawerContent, Box } from "@chakra-ui/core";
import { MdDehaze } from "react-icons/md";
// Use overriden SideNav
import { SideNav } from "./SideNav";
import { useRouteChanged } from "../../functions/useRouteChanged";

export const MobileNav = (props) => {
    const { isOpen, onToggle, onClose } = useDisclosure();
    useRouteChanged({ onComplete: onClose });

    return (
        <>
            <IconButton
                display={{ sm: "inline-flex", md: "none" }}
                aria-label="Navigation Menu"
                fontSize="30px"
                variant="ghost"
                icon={MdDehaze}
                onClick={onToggle}
                marginRight="-16px"
            />
            <Drawer size="xs" isOpen={isOpen} placement="left" onClose={onClose}>
                <DrawerOverlay />
                <DrawerContent height="100vh" overflowY="auto">
                    <DrawerBody p={0}>
                        <SideNav fontSize="1em" {...props} />
                        <Box h="100px" />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>
        </>
    );
};

export default MobileNav;
