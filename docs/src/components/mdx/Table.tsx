import { Box } from "@chakra-ui/react";

export const Table = (props) => (
    <Box overflowX="auto" my="1em">
        <Box as="table" textAlign="left" my="2em" width="full" {...props} />
    </Box>
);
