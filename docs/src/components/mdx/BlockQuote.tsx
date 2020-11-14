import { Alert } from "@chakra-ui/react";

export const BlockQuote = (props) => (
    <Alert
        shadow="sm"
        variant="left-accent"
        status="warning"
        css={{ "> *:first-of-type": { marginTop: 0 } }}
        lineHeight="1em"
        {...props}
    />
);
