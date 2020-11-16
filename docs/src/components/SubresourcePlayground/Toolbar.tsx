import { CheckIcon } from "@chakra-ui/icons";
import {
    Box,
    Button,
    Icon,
    IconButton,
    Input,
    InputGroup,
    InputLeftAddon,
    InputRightAddon,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Stack,
    Textarea,
    useClipboard,
    useDisclosure,
} from "@chakra-ui/react";
import { useContext, useMemo, useRef, useState } from "react";

import { BasicDialog } from "../BasicDialog";
import { SubresourcePlaygroundContext } from "./helpers";

export function Toolbar({ onSubmit, onMaxDepthChange, generateRoutes }) {
    const { entities, entityNames, addRoute, resetEntities } = useContext(SubresourcePlaygroundContext);
    const inputRef = useRef<HTMLInputElement>();

    const valueToCopy = useMemo(() => JSON.stringify(entities, null, 4), [entities]);
    const { onCopy, hasCopied } = useClipboard(valueToCopy);

    return (
        <Box
            as="form"
            onSubmit={(e) => {
                e.preventDefault();
                if (inputRef.current.value && inputRef.current.value.trim()) {
                    onSubmit(inputRef.current.value);
                    inputRef.current.value = "";
                }
            }}
        >
            <Stack direction="row" alignItems="flex-end" spacing="4">
                <InputGroup size="sm">
                    <Input
                        ref={inputRef}
                        rounded="0"
                        placeholder="Add new entity name"
                        name="entityName"
                        maxWidth={300}
                    />
                    <InputRightAddon padding="0">
                        <IconButton
                            variant="ghost"
                            aria-label="Add new entity"
                            icon={<CheckIcon />}
                            size="sm"
                            type="submit"
                        />
                    </InputRightAddon>
                </InputGroup>
                <Stack direction="row">
                    <NumberInput min={1} size="sm" defaultValue={2} onChange={onMaxDepthChange}>
                        <InputGroup size="sm">
                            <InputLeftAddon children="Global max depth" />
                            <Input as={() => <NumberInputField width="60px" />} />
                        </InputGroup>
                        <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                        </NumberInputStepper>
                    </NumberInput>
                </Stack>
            </Stack>
            <Stack direction="row" mt="4" shouldWrapChildren>
                <Button onClick={() => resetEntities()}>Reset</Button>
                <ImportDialog onSave={(json) => resetEntities(json)} />
                <Button onClick={onCopy}>{hasCopied ? "Copied" : "Export"}</Button>
                <Button onClick={generateRoutes}>Generate all possible routes</Button>
                <Menu>
                    <MenuButton
                        as={(props) => (
                            <Button {...props} aria-label="Add route">
                                Add route
                            </Button>
                        )}
                    >
                        <Icon name="add" />
                    </MenuButton>
                    <MenuList>
                        {entityNames.map((name) => (
                            <MenuItem key={name} onClick={() => addRoute(name)}>
                                {name}
                            </MenuItem>
                        ))}
                    </MenuList>
                </Menu>
            </Stack>
        </Box>
    );
}

function ImportDialog({ onSave }) {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const textareaRef = useRef<HTMLTextAreaElement>();
    const [error, setError] = useState(null);

    const handleSave = () => {
        const value = textareaRef.current.value;
        try {
            const json = JSON.parse(value);
            console.log(json);
            onSave(json);
        } catch (error) {
            setError(error.message);
        } finally {
            onClose();
        }
    };

    return (
        <>
            <Button onClick={onOpen}>Import</Button>
            <BasicDialog
                {...{ isOpen, onClose }}
                title="Import JSON"
                actions={
                    <Button colorScheme="blue" mr={3} onClick={handleSave}>
                        Save
                    </Button>
                }
            >
                <Textarea ref={textareaRef} placeholder="Paste JSON config here..." />
                {error}
            </BasicDialog>
        </>
    );
}
