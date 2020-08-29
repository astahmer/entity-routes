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
                headerLogo={
                    <Link href="/">
                        <img src="/logo-full.png" style={{ opacity: 0.8 }} width="200px" />
                    </Link>
                }
                headerItems={[
                    <Link href="/">Docs</Link>,
                    <GithubLink key="0" url="https://github.com/astahmer/entity-routes" />,
                    <ColorModeSwitch key="1" />,
                ]}
                githubUrl="astahmer/entity-routes/docs"
                branch="main"
                initialColorMode="dark"
                sidebarOrdering={{
                    "index.md": true,
                    "getting-started": true,
                    "entity-routes": {
                        introduction: true,
                        "route-scope": true,
                        operations: true,
                        groups: true,
                        subresources: true,
                        filters: true,
                        decorators: true,
                        "request-context": true,
                        middlewares: true,
                        hooks: true,
                        "request-lifecycle": true,
                    },
                    internals: true,
                    compatibility: true,
                    definitions: true,
                }}
                mdxComponents={{ code: Code, table: Table, wrapper: Wrapper }}
            >
                <Component {...pageProps} />
            </DokzProvider>
        </Fragment>
    );
}
