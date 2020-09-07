import { useState, useRef, createContext, useContext, ReactNode } from "react";
import {
    Box,
    Stack,
    IconButton,
    CheckboxGroup,
    Checkbox,
    Tag,
    TagLabel,
    TagCloseButton,
    Input,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    Menu,
    MenuButton,
    Button,
    MenuList,
    MenuItem,
    Icon,
    Flex,
    Editable,
    EditablePreview,
    EditableInput,
    InputGroup,
    InputRightAddon,
    useDisclosure,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    ModalFooter,
    Textarea,
    IModal,
    useClipboard,
} from "@chakra-ui/core";

const baseEntityNames = ["User", "Article", "Comment", "Upvote"];
const makeRecordFromKeys = (keys: string[], defaultValue: any) =>
    Object.fromEntries(
        keys.map((name) => [name, typeof defaultValue === "function" ? defaultValue(name) : defaultValue])
    );

const defaultEntity: Entity = { maxDepths: {}, properties: [], routes: [[]] };
type Entity = { maxDepths: Record<string, number>; properties: string[]; routes: Array<string[]> };
type Entities = Record<string, Entity>;

const Debug = ({ json }) => <pre>{JSON.stringify(json || {}, null, 4)}</pre>;
const addValue = (arr: any[], value: any) => (arr || []).concat(value);
const setValueAt = (arr: any[], value: any, index: number) => [...arr.slice(0, index), value, ...arr.slice(index + 1)];
const removeValue = (arr: any[], value: any) => arr.filter((item) => item !== value);

type MaxDepthContext = {
    resetEntities: () => void;
    setEntities: (value: Record<string, Entity>) => void;
    entities: Record<string, Entity>;
    entityNames: string[];
    removeEntity: (name: string) => void;
    setMaxDepths: (entity: string, maxDepths: Record<string, number>) => void;
    setProperties: (entity: string, properties: string[]) => void;
    setRoutes: (entity: string, routes: Array<string[]>) => void;
    addRoute: (entity: string) => void;
    globalMaxDepth: number;
};
const MaxDepthContext = createContext<MaxDepthContext>(null);

let resetKey = 0;
// TODO Import/Export subresource config
// TODO Auto routes generation ?
export function SubresourcePlayground() {
    const [globalMaxDepth, setGlobalMaxDepth] = useState(2);
    const [entities, setEntities] = useState<Entities>(makeRecordFromKeys(baseEntityNames, defaultEntity));
    const entityNames = Object.keys(entities);
    const resetEntities = () => {
        resetKey++;
        setEntities(makeRecordFromKeys(baseEntityNames, defaultEntity));
    };

    // Generics
    const addEntity = (name: string) => setEntities((current) => ({ ...current, [name]: defaultEntity }));
    // TODO Remove (routes with subresources) from entity
    // TODO Remove max depths for entity
    const removeEntity = (name: string) =>
        setEntities((current) =>
            Object.fromEntries(
                Object.entries(current)
                    .filter(([key, value]) => key !== name)
                    .map(([key, { maxDepths: { [name]: removed, ...otherMaxDepths }, properties, routes }]) => [
                        key,
                        {
                            maxDepths: { ...otherMaxDepths },
                            properties: removeValue(properties, name),
                            routes: removeValue(routes, name),
                        },
                    ])
            )
        );

    const setEntityKeyValue = (entity: string, key: string, value: any) =>
        setEntities((current) => ({
            ...current,
            [entity]: {
                ...(current[entity] || defaultEntity),
                [key]: value,
            },
        }));

    const setMaxDepths = (entity: string, maxDepths: Record<string, number>) =>
        setEntityKeyValue(entity, "maxDepths", maxDepths);
    // Properties
    const setProperties = (entity: string, properties: string[]) => setEntityKeyValue(entity, "properties", properties);

    // Routes
    const setRoutes = (entity: string, routes: Array<string[]>) => setEntityKeyValue(entity, "routes", routes);
    const addRoute = (entity: string) => setRoutes(entity, [...entities[entity].routes, []]);

    const ctx: MaxDepthContext = {
        resetEntities,
        setEntities,
        entities,
        entityNames,
        removeEntity,
        setMaxDepths,
        setProperties,
        setRoutes,
        addRoute,
        globalMaxDepth,
    };

    return (
        <MaxDepthContext.Provider value={ctx} key={resetKey}>
            Reset key : {resetKey}
            <Stack spacing={6} shouldWrapChildren>
                <Toolbar onSubmit={addEntity} onMaxDepthChange={setGlobalMaxDepth} />
                <PropsByEntities />
                <SubresourceRoutes />
                <Debug json={{ globalMaxDepth, entities }} />
            </Stack>
        </MaxDepthContext.Provider>
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
            resetKey++;
            onSave(json);
        } catch (error) {
            setError(error);
        }
    };

    return (
        <>
            <Button onClick={onOpen}>Import config</Button>
            <BasicDialog
                {...{ isOpen, onClose }}
                title="Import JSON"
                actions={
                    <Button variantColor="blue" mr={3} onClick={handleSave}>
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

// type WithChildren = {children: ReactNode};
type BasicDialogProps = Pick<IModal, "children" | "isOpen" | "onClose"> & { title: string; actions?: ReactNode };
function BasicDialog({ children, isOpen, onClose, title, actions }: BasicDialogProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} blockScrollOnMount={false}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalCloseButton />
                <ModalBody>{children}</ModalBody>

                <ModalFooter>
                    <Button mr={3} onClick={onClose}>
                        Close
                    </Button>
                    {actions}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

const Toolbar = ({ onSubmit, onMaxDepthChange }) => {
    const { entities, resetEntities, setEntities } = useContext(MaxDepthContext);
    const inputRef = useRef<HTMLInputElement>();

    const valueToCopy = JSON.stringify(entities, null, 4);
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
                <Box>
                    <Stack direction="row">
                        <Stack spacing={4}>
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
                                        icon="check"
                                        size="sm"
                                        type="submit"
                                    />
                                </InputRightAddon>
                            </InputGroup>
                        </Stack>
                    </Stack>
                </Box>
                <Box>
                    Global max depth :
                    <Stack direction="row">
                        <NumberInput min={1} size="sm" defaultValue={2} onChange={onMaxDepthChange}>
                            <NumberInputField pl="2" />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                    </Stack>
                </Box>
                <Button onClick={resetEntities}>Reset</Button>
                <ImportDialog onSave={(json) => setEntities(json)} />
                <Button onClick={onCopy} ml={2}>
                    {hasCopied ? "Copied" : "Export config"}
                </Button>
            </Stack>
        </Box>
    );
};

const PropsByEntities = () => {
    const ctx = useContext(MaxDepthContext);

    return (
        <Box>
            Available subresources relation :
            <Stack direction="row" spacing="50px" shouldWrapChildren flexWrap="wrap">
                {ctx.entityNames.map((item, i) => (
                    <EntityProps key={item + i} item={item} />
                ))}
            </Stack>
        </Box>
    );
};

type EntityProps = { item: string };
const EntityProps = ({ item }: EntityProps) => {
    const { entities, entityNames, addRoute, removeEntity, setProperties, setMaxDepths } = useContext(MaxDepthContext);

    const setMaxDepth = (entity: string, property: string, maxDepth: number) =>
        setMaxDepths(entity, {
            ...entities[entity].maxDepths,
            [property]: typeof maxDepth === "string" ? Number(maxDepth) : maxDepth,
        });

    console.log(item);

    return (
        <Stack direction="column" alignItems="center" shouldWrapChildren>
            <Tag size="sm" rounded="full" variant="solid" variantColor="cyan">
                <TagLabel onClick={() => addRoute(item)} cursor="pointer">
                    {item}
                </TagLabel>
                <TagCloseButton onClick={() => removeEntity(item)} />
            </Tag>
            <CheckboxGroup
                defaultValue={entities[item].properties}
                onChange={(value) => setProperties(item, value as string[])}
            >
                <Stack direction="column" mb="4">
                    {entityNames.map((entity, i) => (
                        <>
                            <Checkbox
                                value={entity}
                                key={i}
                                defaultIsChecked={entities[item].properties.includes(entity)}
                            >
                                {entity}
                                {item === entity && " (Recursive)"}
                            </Checkbox>
                            {entities[item].properties.includes(entity) && (
                                <Editable
                                    placeholder="Max depth"
                                    defaultValue={entities[item].maxDepths[entity] as any}
                                >
                                    {({ isEditing, onRequestEdit }) => (
                                        <>
                                            {!isEditing && entities[item].maxDepths[entity] && (
                                                <span onClick={onRequestEdit}>Max depth: </span>
                                            )}
                                            <EditablePreview />
                                            <EditableInput
                                                width="90px"
                                                {...{ type: "number", min: 1 }}
                                                onInput={(e) => setMaxDepth(item, entity, (e.target as any).value)}
                                            />
                                        </>
                                    )}
                                </Editable>
                            )}
                        </>
                    ))}
                </Stack>
            </CheckboxGroup>
        </Stack>
    );
};

const SubresourceRoutes = () => {
    const { entities, entityNames, setRoutes } = useContext(MaxDepthContext);

    // Replace current subresource with selected && remove later parts
    const setSubresourceAt = (entity: string, subresource: string, routeIndex: number, propIndex: number) =>
        setRoutes(
            entity,
            setValueAt(
                entities[entity].routes,
                [...entities[entity].routes[routeIndex].slice(0, propIndex), subresource],
                routeIndex
            )
        );

    const addSubresource = (entity: string, routeIndex: number, subresource: string) =>
        setRoutes(
            entity,
            setValueAt(entities[entity].routes, addValue(entities[entity].routes[routeIndex], subresource), routeIndex)
        );
    const removeLastSubresource = (entity: string, routeIndex: number) =>
        setRoutes(
            entity,
            setValueAt(entities[entity].routes, entities[entity].routes[routeIndex].slice(0, -1), routeIndex)
        );

    return (
        <Box>
            Routes with subresources :
            <Stack>
                {entityNames.map((entity, i) =>
                    entities[entity].routes.map((route, routeIndex) => (
                        <SubresourceRoute
                            key={entity + routeIndex}
                            {...{ entity, addSubresource, removeLastSubresource, setSubresourceAt, route, routeIndex }}
                        />
                    ))
                )}
            </Stack>
        </Box>
    );
};

type SubresourceRouteProps = {
    addSubresource: (entity: string, routeIndex: number, subresource: string) => void;
    removeLastSubresource: (entity: string, routeIndex: number) => void;
    setSubresourceAt: (entity: string, subresource: string, routeIndex: number, propIndex: number) => void;
    entity: string;
    route: string[];
    routeIndex: number;
};
const SubresourceRoute = ({
    entity,
    route,
    routeIndex,
    addSubresource,
    removeLastSubresource,
    setSubresourceAt,
}: SubresourceRouteProps) => {
    const { entities, globalMaxDepth } = useContext(MaxDepthContext);

    const state = entities[entity];

    const currentDepth = route.length;
    const defaultMaxDepth = globalMaxDepth || 2;
    const maxDepths = route.map((subresource) => entities[entity].maxDepths[subresource] || defaultMaxDepth);
    const relativeMaxDepths = maxDepths.map((maxDepth, depth) => maxDepth + depth);
    const hasReachedMaxDepth = relativeMaxDepths.some((maxDepth) => currentDepth > maxDepth);
    hasReachedMaxDepth && console.log({ route, currentDepth, maxDepths, relativeMaxDepths, hasReachedMaxDepth });

    const lastPart = route[route.length - 1] || entity;
    const lastPartProperties = entities[lastPart]?.properties || [];

    return (
        <Flex direction="row" alignItems="baseline" width="fit-content" key={entity + routeIndex}>
            <Box as="span" mr="2">
                {entity}
            </Box>
            {route.map((subresource, subresourceIndex) => (
                <SubresourcePart
                    key={subresourceIndex}
                    {...{
                        entity,
                        routeIndex,
                        setSubresourceAt,
                        subresource,
                        index: subresourceIndex,
                        properties: lastPartProperties,
                    }}
                />
            ))}
            <Box position="relative">
                <Menu>
                    <MenuButton
                        as={(props) => (
                            <Button
                                {...props}
                                variant="ghost"
                                aria-label="Add subresource"
                                size="xs"
                                isDisabled={!lastPartProperties.length}
                            />
                        )}
                    >
                        <Icon name="add" />
                    </MenuButton>
                    <MenuList>
                        {lastPartProperties.map((name) => (
                            <MenuItem key={name} onClick={() => addSubresource(entity, routeIndex, name)}>
                                {name}
                            </MenuItem>
                        ))}
                    </MenuList>
                </Menu>
            </Box>
            {state.routes[routeIndex].length && (
                <IconButton
                    variant="ghost"
                    aria-label="Remove subresource"
                    icon="delete"
                    size="xs"
                    onClick={() => removeLastSubresource(entity, routeIndex)}
                />
            )}
        </Flex>
    );
};

type SubresourcePartProps = Pick<SubresourceRouteProps, "setSubresourceAt" | "entity" | "routeIndex"> & {
    subresource: string;
    index: number;
    properties: string[];
};
const SubresourcePart = ({
    entity,
    routeIndex,
    setSubresourceAt,
    subresource,
    index,
    properties,
}: SubresourcePartProps) => {
    return (
        <Flex key={index} alignItems="center">
            <Box as="span" mx="1">
                /
            </Box>

            <Stack alignItems="center" direction="row" shouldWrapChildren>
                <Menu key={"editSub" + entity + routeIndex + index}>
                    <MenuButton
                        as={(props) => <Button {...props} variant="ghost" aria-label="Edit subresource" padding="2" />}
                    >
                        {subresource}
                    </MenuButton>
                    <MenuList zIndex={10}>
                        {properties.map((item, i) => (
                            <MenuItem key={i} onClick={() => setSubresourceAt(entity, item, routeIndex, index)}>
                                {item}
                            </MenuItem>
                        ))}
                    </MenuList>
                </Menu>
            </Stack>
        </Flex>
    );
};
