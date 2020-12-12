import { AnalyticsScript } from "@/seo/analytics-script";
import { ColorModeScript } from "@chakra-ui/react";
import NextDocument, { DocumentContext, Head, Html, Main, NextScript } from "next/document";
import React from "react";

class Document extends NextDocument {
    static getInitialProps(ctx: DocumentContext) {
        return NextDocument.getInitialProps(ctx);
    }

    render() {
        return (
            <Html lang="en">
                <Head />
                <body>
                    <ColorModeScript />
                    <Main />
                    <NextScript />
                    <AnalyticsScript />
                </body>
            </Html>
        );
    }
}

export default Document;
