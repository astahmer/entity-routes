import { Image, Box, BoxProps } from "@chakra-ui/core";

export function Logo(props: BoxProps) {
    return (
        <Box {...props}>
            <Image src={require("../public/logo_full.png")} />
        </Box>
    );
}
