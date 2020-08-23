import { Stack } from "@chakra-ui/core";
import { Wrapper as DokzWrapper, MDXComponents } from "dokz";

// Add h1 to every page based on name(dokz)/title(typedoc)
export const Wrapper = ({ children, ...props }) => {
    const title = props.meta.title || props.meta.name;
    const meta = props.meta;

    if (meta?.tableOfContents?.children?.length) {
        meta.tableOfContents.children[0].slug = "#" + title.toLowerCase();
        meta.tableOfContents.children[0].title = title;
    }

    return (
        <DokzWrapper {...props} meta={meta}>
            <Stack spacing={4}>
                {title && <MDXComponents.h1 id={title.toLowerCase()}>{title}</MDXComponents.h1>}
                {children}
            </Stack>
        </DokzWrapper>
    );
};
