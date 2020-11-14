import { MDXProvider } from "@mdx-js/react";
import { createContext, useContext, ReactNode, ComponentType } from "react";
import MDXComponents from "@/components/DokzOverride/mdx";
import { Box, ChakraProvider, css } from "@chakra-ui/react";
import { ColorModeSwitch } from "@/components/DokzOverride/NavBar";

import { PrismTheme } from "prism-react-renderer";
import darkPrismTheme from "prism-react-renderer/themes/oceanicNext";

import { resetCodeBlockCount } from "@/components/DokzOverride/Code";
import { useRouteChanged } from "@/functions/useRouteChanged";
import { Arrow, ArrowEmpty } from "./DokzOverride/icons";

export function LayoutProvider({ children, ...rest }: LayoutProviderProps) {
    const ctx = { ...defaultLayoutContext, ...rest };
    const { mdxComponents: userMDXComponents = {} } = ctx;

    // On route change, reset code block count & scroll to top if no anchor used
    useRouteChanged({
        onStart: resetCodeBlockCount,
        onComplete: () => {
            if (window.location.hash) return;
            document.body.style.scrollBehavior = "auto";
            document.body.scrollTo({ top: 0, left: 0, behavior: "auto" });
            document.body.style.scrollBehavior = "smooth";
        },
    });

    return (
        <LayoutContext.Provider value={ctx}>
            <MDXProvider components={{ ...MDXComponents, ...userMDXComponents }}>
                <ChakraProvider>
                    {children}
                    <style jsx global>
                        {globalStyles}
                    </style>
                </ChakraProvider>
            </MDXProvider>
        </LayoutContext.Provider>
    );
}

const defaultDarkPrismTheme = {
    ...darkPrismTheme,
    plain: {
        ...darkPrismTheme.plain,
        backgroundColor: "#2D3748",
    },
};

export const defaultLayoutContext: LayoutProviderProps = {
    maxPageWidth: "1600px",
    headTitlePrefix: "",
    headerLogo: (
        <Box fontWeight="medium" fontSize="32px">
            Your Logo
        </Box>
    ),
    headerItems: [<ColorModeSwitch key={0} />],
    headingColor: { light: "#111", dark: "rgba(255,255,255,1)" },
    footer: null,
    prismTheme: { dark: defaultDarkPrismTheme, light: darkPrismTheme },
    bodyColor: { light: "#222", dark: "rgba(255,255,255,.9)" },
    fontSize: ["16px", null, null, "18px"],
    fontFamily: `-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"`,
    fontWeight: "400",
    listItemIcon: Arrow,
    listItemIconEmpty: ArrowEmpty,
};

const LayoutContext = createContext(defaultLayoutContext);

export const useLayoutConfig = () => useContext(LayoutContext);

export type LayoutProviderProps = {
    children?: any;
    /* The logo displayed on the header nav bar */
    headerLogo?: ReactNode;
    /* The page fontSize */
    fontSize?: string | string[];
    /* The page fontWeight, defaults to 400 */
    fontWeight?: string;
    /* The <title/> in <head/> prefix */
    headTitlePrefix?: string;
    /* The icon used to prefix a list item inside <ul> or <ol> */
    listItemIcon?: React.ComponentType;
    /* The icon used to prefix a list item inside <ul> or <ol>, in nested lists */
    listItemIconEmpty?: React.ComponentType;
    /* Links in the right nav bar */
    headerItems?: ReactNode[] | ReactNode;
    /* Footer at the end of every mdx page */
    footer?: ReactNode;
    /* Mdx object mapping from mdx element to component */
    mdxComponents?: { [k: string]: ComponentType<any> };
    /* The theme for the code blocks */
    prismTheme?: { dark: PrismTheme; light: PrismTheme };
    /* The max-width of the page container, defaults to '1600px' */
    maxPageWidth?: string;
    /* The color of the page text */
    bodyColor?: { dark: string; light: string };
    /* The color of the heading elements */
    headingColor?: { dark: string; light: string };
    /* The font family */
    fontFamily?: string;
};

export const globalStyles = css`
    * {
        box-sizing: border-box;
    }
    html {
        height: 100%;
    }
    #__next {
        min-height: 100%;
        overflow-x: hidden;
    }
    body {
        height: 100%;
        overflow: auto;
        scroll-behavior: smooth;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
    }
    .overflowScrollingTouch {
        -webkit-overflow-scrolling: touch;
    }
`;
