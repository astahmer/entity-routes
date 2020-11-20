import { Box, Collapse, Flex, UseDisclosureProps, UseDisclosureReturn, useDisclosure } from "@chakra-ui/react";
import { PropsWithChildren, ReactNode } from "react";

import { NavTreeComponentBaseProps } from "./SideNav";

export function CollapsableTree({ children, renderTitle, title, depth, defaultIsOpen }: CollapsableTreeProps) {
    const { onToggle, isOpen } = useDisclosure({ defaultIsOpen });
    const titleProps = { title, onToggle, isOpen, depth };

    return (
        <Flex direction="column">
            {renderTitle ? renderTitle(titleProps) : title}
            <Collapse in={isOpen} startingHeight={1}>
                <Box pl={(depth || 1) * 20 + "px"} position="relative">
                    <Box
                        position="absolute"
                        left="5px"
                        height="100%"
                        border="1px solid"
                        borderColor="gray.400"
                        opacity={0.1}
                    />
                    {children}
                </Box>
            </Collapse>
        </Flex>
    );
}

export type CollapsableTreeProps = Pick<NavTreeComponentBaseProps, "depth"> &
    PropsWithChildren<{
        title: string;
        renderTitle?: (props: RenderTitleProps) => ReactNode;
        defaultIsOpen: UseDisclosureProps["defaultIsOpen"];
    }>;

export type RenderTitleProps = Pick<CollapsableTreeProps, "title" | "depth"> &
    Pick<UseDisclosureReturn, "isOpen" | "onToggle">;
