import { Alert, AlertIcon, AlertProps } from "@chakra-ui/core";
import { PropsWithChildren } from "react";

export function DocAlert({ children, ...props }: PropsWithChildren<AlertProps>) {
    return (
        <Alert status="info" variant="left-accent" {...props}>
            <AlertIcon />
            {children}
        </Alert>
    );
}
