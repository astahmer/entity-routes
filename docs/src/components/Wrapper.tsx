import { Stack } from "@chakra-ui/core";
import { Wrapper as DokzWrapper, MDXComponents } from "dokz";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { reset } from "@/functions/codeBlocks";

export const Wrapper = ({ children, ...props }) => {
    const meta = props.meta;
    const title = meta?.title || meta?.name;
    const withTitle = !meta?.withoutTitle;

    if (title && meta?.tableOfContents?.children?.length) {
        if (meta.tableOfContents.children[0].title !== title) {
            meta.tableOfContents.children.unshift({ title, slug: "#" + title.toLowerCase(), depth: 1 });
        }
    }

    const router = useRouter();

    // On route change, reset code block count
    useEffect(() => {
        const handleRouteChange = (url) => {
            reset();
            console.log("App is changing to: ", url);
        };

        router.events.on("routeChangeStart", handleRouteChange);

        // If the component is unmounted, unsubscribe
        // from the event with the `off` method:
        return () => {
            router.events.off("routeChangeStart", handleRouteChange);
        };
    }, []);

    return (
        <DokzWrapper {...props} meta={meta}>
            <Stack spacing={6} fontSize={[16, 16, 16, 16, 17]} shouldWrapChildren>
                {/* Add h1 to every page based on name(dokz)/title(typedoc) */}
                {title && withTitle && <MDXComponents.h1 id={title.toLowerCase()}>{title}</MDXComponents.h1>}
                {children}
            </Stack>
            {/* Make table of contents (on the right) scrollable, max height to 100 minus header */}
            <style jsx global>{`
                .mainContent + div {
                    overflow: auto;
                    max-height: calc(100vh - 62px);
                }
            `}</style>
        </DokzWrapper>
    );
};
