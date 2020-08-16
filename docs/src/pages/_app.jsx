import { DokzProvider, GithubLink, ColorModeSwitch, Wrapper, MDXComponents, Link } from "dokz";
import React, { Fragment } from "react";
import Head from "next/head";
import { Stack } from "@chakra-ui/core";

import { Code } from "@/components/Code";

// Add h1 to every page based on name(dokz)/title(typedoc)
const WrappedWrapper = ({ children, ...props }) => {
    const title = props.meta.title || props.meta.name;
    return (
        <Wrapper {...props}>
            <Stack spacing={4}>
                {title && <MDXComponents.h1>{title}</MDXComponents.h1>}
                {children}
            </Stack>
        </Wrapper>
    );
};

export default function App(props) {
    const { Component, pageProps } = props;
    return (
        <Fragment>
            <Head>
                <link
                    href="https://fonts.googleapis.com/css?family=Fira+Code"
                    rel="stylesheet"
                    key="google-font-Fira"
                />
            </Head>
            <DokzProvider
                headerItems={[
                    <Link href="/">Docs</Link>,
                    <GithubLink key="0" url="https://github.com/astahmer/entity-routes" />,
                    <ColorModeSwitch key="1" />,
                ]}
                githubUrl="astahmer/entity-routes-web"
                branch="main"
                initialColorMode="dark"
                sidebarOrdering={{
                    "index.md": false,
                    "getting-started": true,
                    "entity-routes": true,
                }}
                mdxComponents={{ wrapper: WrappedWrapper, code: Code }}
            >
                <Component {...pageProps} />
            </DokzProvider>
        </Fragment>
    );
}
