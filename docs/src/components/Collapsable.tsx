import { useState } from "react";
import { Collapse, Button, Flex, Box } from "@chakra-ui/react";

export function Collapsable({ children, collapse, button, btnLabel, suffix = "" }) {
    const [show, setShow] = useState(false);

    const handleToggle = () => setShow(!show);

    return (
        <>
            <Box mb={!show ? "1em" : "-0.5em"}>
                <Collapse startingHeight={20} {...collapse} in={show}>
                    {children}
                </Collapse>
            </Box>
            <Flex justifyContent={["center", "flex-start"]} alignItems="center">
                <Button size="sm" {...button} onClick={handleToggle}>
                    {btnLabel ? btnLabel(show) : "Show " + (show ? "less" : "more") + " " + suffix}
                </Button>
            </Flex>
        </>
    );
}
