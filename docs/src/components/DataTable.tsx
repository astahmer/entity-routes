import { MDXComponents } from "dokz";

export function DataTable({ columns, rows }) {
    return (
        <MDXComponents.table>
            <thead>
                <tr>
                    {columns.map((col, i) => (
                        <MDXComponents.th key={i}>{col}</MDXComponents.th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr>
                        {row.map((col, i) => (
                            <MDXComponents.td key={i}>{col}</MDXComponents.td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </MDXComponents.table>
    );
}
