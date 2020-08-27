import { DokzProvider, GithubLink, ColorModeSwitch, Link } from "dokz";
import React, { Fragment } from "react";
import Head from "next/head";

import { Code, Table, Wrapper } from "@/components";

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
                    "index.md": true,
                    "getting-started": true,
                    "entity-routes": {
                        introduction: true,
                        "route-mapping": true,
                        operations: true,
                        groups: true,
                        subresources: true,
                        filters: true,
                        decorators: true,
                        hooks: true,
                        "request-context": true,
                        middlewares: true,
                        "response-lifecycle": true,
                    },
                    internals: true,
                    compatibility: true,
                    "api-reference": true,
                }}
                mdxComponents={{ code: Code, table: Table, wrapper: Wrapper }}
            >
                <Component {...pageProps} />
            </DokzProvider>
        </Fragment>
    );
}
