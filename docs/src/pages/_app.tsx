import { Divider } from "@chakra-ui/react";
import Head from "next/head";
import { Router } from "next/router";
import { Fragment } from "react";

import { LayoutProvider, PageProvider } from "@/components/layout";
import { ColorModeSwitch, GithubLink } from "@/components/layout/NavBar";
import MDXComponents from "@/components/mdx";
import { trackPageview } from "@/seo/trackEvent";

Router.events.on("routeChangeComplete", (url) => {
    trackPageview(url);
});

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
                    <MDXComponents.a href="/">
                        <img src="/logo-full.png" style={{ opacity: 0.8 }} width="200px" />
                    </MDXComponents.a>
                }
                headerItems={[
                    <MDXComponents.a href="/">Docs</MDXComponents.a>,
                    <GithubLink key="0" url="https://github.com/astahmer/entity-routes" />,
                    <ColorModeSwitch key="1" />,
                ]}
                maxPageWidth="1350px"
                mdxComponents={{
                    wrapper: PageProvider,
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
