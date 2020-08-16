import { Stack } from "@chakra-ui/core";
import { Wrapper as DokzWrapper, MDXComponents } from "dokz";

// Add h1 to every page based on name(dokz)/title(typedoc)
export const Wrapper = ({ children, ...props }) => {
    const title = props.meta.title || props.meta.name;
    return (
        <DokzWrapper {...props}>
            <Stack spacing={4}>
                {title && <MDXComponents.h1>{title}</MDXComponents.h1>}
                {children}
            </Stack>
        </DokzWrapper>
    );
};
