import { Fragment } from "react";
import Head from "next/head";

import { Code, Wrapper } from "@/components";
import { Divider } from "@chakra-ui/react";
import { ColorModeSwitch, GithubLink } from "@/components/layout/NavBar";
import MDXComponents from "@/components/layout/mdx";
import { Link } from "@/components/layout/Link";
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
                maxPageWidth="1350px"
                mdxComponents={{
                    code: Code,
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
                }}
            >
                <Component {...pageProps} />
            </LayoutProvider>
        </Fragment>
    );
}
