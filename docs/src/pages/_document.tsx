import { ColorModeScript } from "@chakra-ui/react";
import NextDocument, { DocumentContext, Head, Html, Main, NextScript } from "next/document";
import React from "react";

import { GAScript } from "@/seo/ga-script";

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
                    <GAScript />
                </body>
            </Html>
        );
    }
}

export default Document;
