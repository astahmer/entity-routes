import { Box } from "@chakra-ui/core";
import { useDokzConfig } from "dokz";
import React, { Children, isValidElement, cloneElement } from "react";

export function ListItem({ isOdd, isOrdered, children, ...props }) {
    const { listItemIcon, listItemIconEmpty } = useDokzConfig();
    const listIcon = isOrdered ? (
        <Box display="inline-block" />
    ) : (
        <Box mr="0.6em" ml="-1.6em" display="inline-block" size="1.1em" as={isOdd ? listItemIcon : listItemIconEmpty} />
    );
    return (
        <Box ml={(!isOrdered ? "1em" : "0") + " !important"} as="li">
            {/* TODO use primary color to add some more style */}
            {listIcon}
            <Box as="p" display="inline" {...props}>
                {Children.map(children, (child) => {
                    if (isValidElement(child)) {
                        return cloneElement<any>(child, {
                            isOdd,
                        });
                    }
                    return child;
                })}
            </Box>
        </Box>
    );
}
