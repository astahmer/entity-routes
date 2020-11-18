import { Divider } from "@chakra-ui/react";
import { DefaultSeo } from "next-seo";
import Head from "next/head";
import { Router } from "next/router";
import { Fragment } from "react";

import { Logo } from "@/components";
import { LayoutProvider, PageProvider } from "@/components/layout";
import { ColorModeSwitch, GithubLink } from "@/components/layout/NavBar";
import MDXComponents from "@/components/mdx";
import { seoConfig } from "@/seo/config";
import { trackPageview } from "@/seo/trackEvent";

Router.events.on("routeChangeComplete", (url) => {
    trackPageview(url);
});

export default function App(props) {
    const { Component, pageProps } = props;
    return (
        <Fragment>
            <Head>
                <meta content="IE=edge" httpEquiv="X-UA-Compatible" />
                <meta content="width=device-width, initial-scale=1" name="viewport" />
                <meta name="theme-color" content="#1a202c" />
                <link rel="icon" sizes="48x48" href="/favicon.ico" />
                <link
                    href="https://fonts.googleapis.com/css?family=Fira+Code"
                    rel="stylesheet"
                    key="google-font-Fira"
                />
            </Head>
            <DefaultSeo {...seoConfig} />
            <LayoutProvider
                headerLogo={headerLogo}
                headerItems={headerItems}
                maxPageWidth="1450px"
                mdxComponents={mdxComponents}
            >
                <Component {...pageProps} />
            </LayoutProvider>
        </Fragment>
    );
}

const headerLogo = (
    <MDXComponents.a href="/" _hover={{}}>
        <Logo opacity={0.8} />
    </MDXComponents.a>
);

const headerItems = [
    <MDXComponents.a href="/">Docs</MDXComponents.a>,
    <GithubLink key="0" url="https://github.com/astahmer/entity-routes" />,
    <ColorModeSwitch key="1" />,
];

const mdxComponents = {
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
};
