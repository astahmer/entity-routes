import { BoxProps } from "@chakra-ui/react";

import MDXComponents from "@/components/mdx";

export type DataTableProps = { columns: string[]; rows: string[][] } & BoxProps;
export function DataTable({ columns, rows, ...props }: DataTableProps) {
    return (
        <MDXComponents.table {...props}>
            <thead>
                <tr>
                    {columns.map((col, i) => (
                        <MDXComponents.th key={i}>{col}</MDXComponents.th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, i) => (
                    <tr key={i}>
                        {row.map((col, i) => (
                            <MDXComponents.td key={i}>{col}</MDXComponents.td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </MDXComponents.table>
    );
}
