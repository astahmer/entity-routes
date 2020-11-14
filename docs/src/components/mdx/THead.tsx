import { Box, useColorMode } from "@chakra-ui/react";

export const THead = (props) => {
    const { colorMode } = useColorMode();
    const bg = { light: "gray.50", dark: "whiteAlpha.100" };
    return <Box as="th" bg={bg[colorMode]} fontWeight="semibold" p={2} fontSize="sm" {...props} />;
};
