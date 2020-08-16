import { Code as DokzCode } from "dokz";
import { ReactNode } from "react";
import { Box } from "@chakra-ui/core";

type CodeProps = { className: string; children: ReactNode; title?: string };
export function Code({ title, ...props }: CodeProps) {
    return (
        <Box position="relative">
            <DokzCode {...props} />
            {title && (
                <Box
                    className="dokz hiddenInPrint"
                    opacity={0.6}
                    fontSize="0.7em"
                    position="absolute"
                    right="10px"
                    bottom="8px"
                >
                    {title}
                </Box>
            )}
        </Box>
    );
}
