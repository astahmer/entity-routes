import { Box, Image } from "@chakra-ui/react";

export function Logo() {
    return (
        <Box maxWidth="50vw" minWidth="100%" margin="1em auto">
            <Image src={"/logo-full.png"} alt="Logo entity-routes" />
        </Box>
    );
}
