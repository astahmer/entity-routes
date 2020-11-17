import { Box, BoxProps } from "@chakra-ui/react";
import Image from "next/image";

export function Logo(props: BoxProps) {
    return (
        <Box maxWidth="50vw" minWidth="100%" margin="1em auto" {...props}>
            <Image src={"/logo-full-small.png"} alt="entity-routes logo" width={200} height={32} />
        </Box>
    );
}
