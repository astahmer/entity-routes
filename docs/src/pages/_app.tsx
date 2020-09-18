import { DokzProvider, GithubLink, ColorModeSwitch, Link, MDXComponents } from "dokz";
import React, { Fragment } from "react";
import Head from "next/head";

import { Code, Table, Wrapper } from "@/components";
import { Divider } from "@chakra-ui/core";

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
                maxPageWidth="1350px"
                mdxComponents={{
                    code: Code,
                    table: Table,
                    wrapper: Wrapper,
                    h2: (props) => (
                        <>
                            <Divider mt="1.5em" />
                            <MDXComponents.h2 {...props} />
                        </>
                    ),
                }}
            >
                <Component {...pageProps} />
            </DokzProvider>
        </Fragment>
    );
}
