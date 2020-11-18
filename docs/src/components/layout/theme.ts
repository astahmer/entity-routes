import { css, extendTheme } from "@chakra-ui/react";
export const globalStyles = css`
    * {
        box-sizing: border-box;
    }
    html {
        height: 100%;
    }
    #__next {
        min-height: 100%;
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

export const customTheme = extendTheme({ styles: { global: globalStyles } });
