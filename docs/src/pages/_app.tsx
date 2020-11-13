import { Fragment } from "react";
import Head from "next/head";

import { Code, Table, Wrapper } from "@/components";
import { Divider } from "@chakra-ui/core";
import { ListItem } from "@/components/DokzOverride/ListItem";
import { ColorModeSwitch, GithubLink } from "@/components/DokzOverride/NavBar";
import MDXComponents from "@/components/DokzOverride/mdx";
import { Link } from "@/components/DokzOverride/Link";
import { LayoutProvider } from "@/components/LayoutProvider";

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
            <LayoutProvider
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
                    h3: (props) => (
                        <>
                            <Divider mt="0.5em" opacity={0.4} />
                            <MDXComponents.h2 {...props} />
                        </>
                    ),
                    li: (props) => <ListItem {...props} />,
                }}
            >
                <Component {...pageProps} />
            </LayoutProvider>
        </Fragment>
    );
}
