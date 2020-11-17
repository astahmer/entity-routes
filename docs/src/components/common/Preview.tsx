import { Box, Select } from "@chakra-ui/react";
import { useState } from "react";

export function Preview({ options }) {
    const [selected, setSelected] = useState(null);

    return (
        <>
            <Select placeholder="Select option" onChange={(e) => setSelected(e.target.value)}>
                {options.map((item, i) => (
                    <option key={i} value={i}>
                        {item.name}
                    </option>
                ))}
            </Select>

            {options[selected] && (
                <Box as="pre" fontSize="0.8em">
                    {JSON.stringify(options[selected].json, null, 4)}
                </Box>
            )}
        </>
    );
}
