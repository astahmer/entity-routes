import { Divider, Kbd, ListItem, UnorderedList, OrderedList } from "@chakra-ui/react";

import { DokzWrapper } from "@/components/layout/Wrapper";
import { Pre } from "./Pre";
import { Table } from "./Table";
import { THead } from "./THead";
import { TData } from "./TData";
import { DocsHeading } from "./DocsHeading";
import { Paragraph } from "./Paragraph";
import { InlineCode } from "./InlineCode";
import { BlockQuote } from "./BlockQuote";
import { Code } from "./Code";
import { Link } from "./Link";

const MDXComponents = {
    wrapper: DokzWrapper,
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
