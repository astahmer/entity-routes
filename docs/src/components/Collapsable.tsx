import { useState } from "react";
import { Collapse, Button, Flex } from "@chakra-ui/core";

export function Collapsable({ children, collapse, button }) {
    const [show, setShow] = useState(false);

    const handleToggle = () => setShow(!show);

    return (
        <>
            <Collapse startingHeight={20} {...collapse} isOpen={show}>
                {children}
            </Collapse>
            <Flex justifyContent={["center", "flex-start"]} alignItems="center">
                {!show && "[...]"}
                <Button size="sm" ml="1em" mt={show && "-0.5em"} {...button} onClick={handleToggle}>
                    Show {show ? "Less" : "More"}
                </Button>
            </Flex>
        </>
    );
}
