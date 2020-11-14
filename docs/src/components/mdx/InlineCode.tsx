import { Box, useColorMode } from "@chakra-ui/react";

export const CODE_FONT = `'Fira Code',SFMono-Regular,Menlo,Monaco,"Liberation Mono","Courier New",monospace,mono`;
export const InlineCode = ({ ...props }) => {
    const { colorMode } = useColorMode();
    return (
        <Box
            as="code"
            display="inline-block"
            fontFamily={CODE_FONT}
            fontSize="0.9em"
            px="0.2em !important"
            rounded="sm"
            bg={
                {
                    light: "rgba(228, 235, 242, 0.6)",
                    dark: "rgba(106, 111, 117, 0.6)",
                }[colorMode]
            }
            lineHeight="normal"
            {...props}
        />
    );
};
