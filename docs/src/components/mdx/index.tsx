import { Divider, Flex, Kbd, ListItem, OrderedList, UnorderedList } from "@chakra-ui/react";

import { Wrapper } from "@/components/layout/Wrapper";
import { DocAlert } from "@/components/mdx/DocAlert";

import { BlockQuote } from "./BlockQuote";
import { Code } from "./Code";
import { DocsHeading } from "./DocsHeading";
import { InlineCode } from "./InlineCode";
import { Link } from "./Link";
import { Paragraph } from "./Paragraph";
import { Pre } from "./Pre";
import { Table } from "./Table";
import { TData } from "./TData";
import { THead } from "./THead";

const MDXComponents = {
    Flex,
    Info: (props) => <DocAlert status="info" {...props} css={{ svg: { width: "20px" } }} />,
    wrapper: Wrapper,
    hr: (props) => <Divider my="3em !important" {...props} />,
    h1: (props) => <DocsHeading as="h1" fontSize="2em" {...props} />,
    h2: (props) => <DocsHeading as="h2" fontSize="1.4em" {...props} />,
    h3: (props) => <DocsHeading as="h3" fontSize="1.2em" {...props} />,
    inlineCode: InlineCode,
    code: Code,
    pre: Pre,
    kbd: Kbd,
    table: Table,
    th: THead,
    td: TData,
    a: Link,
    p: Paragraph,
    ul: UnorderedList,
    ol: OrderedList,
    li: ListItem,
    blockquote: BlockQuote,
};

export default MDXComponents;
