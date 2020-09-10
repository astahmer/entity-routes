import { useState, useRef, createContext, useContext, ChangeEvent } from "react";
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
    Textarea,
    Tooltip,
    useClipboard,
    Switch,
    FormLabel,
    Grid,
    InputLeftAddon,
    Divider,
} from "@chakra-ui/core";
import { BasicDialog } from "./BasicDialog";
import { Debug } from "./Debug";

const baseEntityNames = ["User", "Article", "Comment", "Upvote"];
const makeRecordFromKeys = (keys: string[], defaultValue: any) =>
    Object.fromEntries(
        keys.map((name) => [name, typeof defaultValue === "function" ? defaultValue(name) : defaultValue])
    );

const defaultEntity: Entity = { maxDepths: {}, properties: [], routes: [[]], canHaveNested: true, canBeNested: true };
type Entity = {
    maxDepths: Record<string, number>;
    properties: string[];
    routes: Array<string[]>;
    canHaveNested: boolean;
    canBeNested: boolean;
};
type Entities = Record<string, Entity>;

const addValue = (arr: any[], value: any) => (arr || []).concat(value);
const setValueAt = (arr: any[], value: any, index: number) => [...arr.slice(0, index), value, ...arr.slice(index + 1)];
const removeValue = (arr: any[], value: any) => arr.filter((item) => item !== value);

const getUniqueRoutes = (routes: string[][]) =>
    Array.from(new Set(routes.map((item) => item.join("_"))))
        .filter(Boolean)
        .map((item) => item.split("_"));

type SubresourcePlaygroundContext = {
    resetEntities: () => void;
    setEntities: (value: Record<string, Entity>) => void;
    entities: Record<string, Entity>;
    entityNames: string[];
    removeEntity: (name: string) => void;
    setMaxDepths: (entity: string, maxDepths: Record<string, number>) => void;
    setBoolean: (entity: string, key: string, value: boolean) => void;
    setProperties: (entity: string, properties: string[]) => void;
    setRoutes: (entity: string, routes: Array<string[]>) => void;
    addRoute: (entity: string) => void;
    globalMaxDepth: number;
};
const SubresourcePlaygroundContext = createContext<SubresourcePlaygroundContext>(null);

let resetKey = 0;
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
    // Remove entity, remove maxDepth/properties references & cut routes path after the removed entity
    const removeEntity = (name: string) =>
        setEntities((current) =>
            Object.fromEntries(
                Object.entries(current)
                    .filter(([key, value]) => key !== name)
                    .map(
                        ([
                            key,
                            {
                                maxDepths: { [name]: removed, ...otherMaxDepths },
                                properties,
                                routes,
                                ...rest
                            },
                        ]) => [
                            key,
                            {
                                maxDepths: { ...otherMaxDepths },
                                properties: removeValue(properties, name),
                                routes: routes.map((route) => {
                                    const index = route.findIndex((subresource) => subresource === name);
                                    return index !== -1 ? route.slice(0, index) : route;
                                }),
                                ...rest,
                            },
                        ]
                    )
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
    const setProperties = (entity: string, properties: string[]) => setEntityKeyValue(entity, "properties", properties);
    const setBoolean = (entity: string, key: string, value: boolean) => setEntityKeyValue(entity, key, value);

    // Routes
    const setRoutes = (entity: string, routes: Array<string[]>) => setEntityKeyValue(entity, "routes", routes);
    const addRoute = (entity: string) => setRoutes(entity, [...entities[entity].routes, []]);
    // TODO check canHaveNested / canBeNested
    const generateRoutes = () => {
        // Recursively add every nested route possible from that path on that entity
        function addNestedRoutes(entity: string, subresource: string, path: string[], routes: string[][]) {
            const currentPath = path.concat(subresource);
            const { hasReachedMaxDepth } = getMaxDepthData({ entity, route: path, globalMaxDepth, entities });

            if (hasReachedMaxDepth) {
                routes.push(path);
                return;
            }

            entities[subresource].properties.map((prop) => addNestedRoutes(entity, prop, currentPath, routes));
        }

        // For each entity, add every possible routes recursively and de-duplicate them
        const entityRoutes = Object.fromEntries(
            Object.entries(entities).map(([name, entity]) => {
                const nestedRoutes = [];
                entity.properties.map((prop) => addNestedRoutes(name, prop, [], nestedRoutes));
                return [name, getUniqueRoutes(nestedRoutes)];
            })
        );

        // Update each entities.routes
        setEntities((current) =>
            Object.fromEntries(
                Object.entries(current).map(([key, value]) => [key, { ...value, routes: entityRoutes[key] }])
            )
        );
    };

    const ctx: SubresourcePlaygroundContext = {
        resetEntities,
        setEntities,
        entities,
        entityNames,
        removeEntity,
        setMaxDepths,
        setProperties,
        setBoolean,
        setRoutes,
        addRoute,
        globalMaxDepth,
    };

    return (
        <SubresourcePlaygroundContext.Provider value={ctx} key={resetKey}>
            <Stack spacing={6} shouldWrapChildren mt="4">
                <Toolbar onSubmit={addEntity} onMaxDepthChange={setGlobalMaxDepth} generateRoutes={generateRoutes} />
                <Divider />
                <PropsByEntities />
                <Divider />
                <SubresourceRouteList />
                <Divider />
                <Debug json={entities} />
            </Stack>
        </SubresourcePlaygroundContext.Provider>
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

const Toolbar = ({ onSubmit, onMaxDepthChange, generateRoutes }) => {
    const { entities, resetEntities, setEntities } = useContext(SubresourcePlaygroundContext);
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
                <InputGroup size="sm">
                    <Input
                        ref={inputRef}
                        rounded="0"
                        placeholder="Add new entity name"
                        name="entityName"
                        maxWidth={300}
                    />
                    <InputRightAddon padding="0">
                        <IconButton variant="ghost" aria-label="Add new entity" icon="check" size="sm" type="submit" />
                    </InputRightAddon>
                </InputGroup>
                <Stack direction="row">
                    <NumberInput min={1} size="sm" defaultValue={2} onChange={onMaxDepthChange}>
                        <InputGroup size="sm">
                            <InputLeftAddon children="Max depth" />
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
                <Button onClick={resetEntities}>Reset</Button>
                <ImportDialog onSave={(json) => setEntities(json)} />
                <Button onClick={onCopy}>{hasCopied ? "Copied" : "Export"}</Button>
                <Button onClick={generateRoutes}>Generate all possible route</Button>
            </Stack>
        </Box>
    );
};

const PropsByEntities = () => {
    const ctx = useContext(SubresourcePlaygroundContext);

    return (
        <Box>
            Available subresources relation :
            <Stack direction="row" spacing="50px" shouldWrapChildren flexWrap="wrap">
                {ctx.entityNames.map((item, i) => (
                    <EntityPropList key={item + i} item={item} />
                ))}
            </Stack>
        </Box>
    );
};

const BoolOption = ({ item, name }) => {
    const { entities, setBoolean } = useContext(SubresourcePlaygroundContext);

    return (
        <Grid gridTemplateColumns="45px 1fr" justifyContent="flex-end">
            <Switch
                id={`switch-${item}-${name}`}
                name={name}
                defaultIsChecked={entities[item][name]}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBoolean(item, e.target.name, e.target.checked)}
            />
            <FormLabel htmlFor={`switch-${item}-${name}`}>{name}</FormLabel>
        </Grid>
    );
};

const EntityName = ({ item }) => {
    const { addRoute, removeEntity } = useContext(SubresourcePlaygroundContext);
    return (
        <Tag size="sm" rounded="full" variant="solid" variantColor="cyan">
            <TagLabel onClick={() => addRoute(item)} cursor="pointer">
                {item}
            </TagLabel>
            <TagCloseButton onClick={() => removeEntity(item)} />
        </Tag>
    );
};

const EntityProp = ({ item, entity, setMaxDepth }) => {
    const { entities } = useContext(SubresourcePlaygroundContext);

    return (
        <>
            <Checkbox value={entity} defaultIsChecked={entities[item].properties.includes(entity)}>
                {entity}
                {item === entity && " (Recursive)"}
            </Checkbox>
            {entities[item].properties.includes(entity) && (
                <Editable placeholder="Max depth" defaultValue={entities[item].maxDepths[entity] as any}>
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
    );
};

type EntityPropList = { item: string };
const EntityPropList = ({ item }: EntityPropList) => {
    const { entities, entityNames, setProperties, setMaxDepths } = useContext(SubresourcePlaygroundContext);

    const setMaxDepth = (entity: string, property: string, maxDepth: number) =>
        setMaxDepths(entity, {
            ...entities[entity].maxDepths,
            [property]: typeof maxDepth === "string" ? Number(maxDepth) : maxDepth,
        });

    return (
        <Stack direction="column" alignItems="center" shouldWrapChildren>
            <EntityName item={item} />
            <Flex direction="column">
                <BoolOption item={item} name="canHaveNested" />
                <BoolOption item={item} name="canBeNested" />
            </Flex>
            <CheckboxGroup
                defaultValue={entities[item].properties}
                onChange={(value) => setProperties(item, value as string[])}
            >
                <Stack direction="column" mb="4">
                    {entityNames.map((entity, i) => (
                        <EntityProp {...{ item, setMaxDepth, entity, i }} />
                    ))}
                </Stack>
            </CheckboxGroup>
        </Stack>
    );
};

const SubresourceRouteList = () => {
    const { entities, entityNames, setRoutes } = useContext(SubresourcePlaygroundContext);

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

    // Add subresource part at the entity.route[index]
    const addSubresource = (entity: string, routeIndex: number, subresource: string) =>
        setRoutes(
            entity,
            setValueAt(entities[entity].routes, addValue(entities[entity].routes[routeIndex], subresource), routeIndex)
        );
    // Remove the last part of a entity.route[index] or remove whole route if route was already empty
    const removeLastSubresource = (entity: string, routeIndex: number) =>
        setRoutes(
            entity,
            entities[entity].routes[routeIndex].length
                ? setValueAt(entities[entity].routes, entities[entity].routes[routeIndex].slice(0, -1), routeIndex)
                : [...entities[entity].routes.slice(0, routeIndex), ...entities[entity].routes.slice(routeIndex + 1)]
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

/** Mirror API.SubresourceManager behavior with subresources max depths */
function getMaxDepthData({
    route,
    globalMaxDepth,
    entities,
    entity: entityName,
}: {
    route: string[];
    globalMaxDepth: number;
    entities: Record<string, Entity>;
    entity: string;
}) {
    const currentDepth = 1 + route.length;
    const defaultMaxDepth = globalMaxDepth || 2;

    const maxDepths = route.map((subresource, index) => [
        subresource,
        entities[route[index - 1] || entityName]?.maxDepths[subresource] || defaultMaxDepth,
        route[index - 1] || entityName,
    ]) as [string, number, string][];
    const relativeMaxDepths = maxDepths.map(([subresource, maxDepth, parent], depth) => [
        subresource,
        maxDepth + depth,
        parent,
    ]);
    // console.log({ route, entities, maxDepths });

    const maxDepthReachedOnIndex = relativeMaxDepths.findIndex(([_, maxDepth]) => currentDepth > maxDepth);
    const maxDepthInfos = maxDepths[maxDepthReachedOnIndex];
    const hasReachedMaxDepth = maxDepthReachedOnIndex !== -1;

    return { hasReachedMaxDepth, maxDepthInfos, maxDepthReachedOnIndex };
}

const maxDepthWarning = ([maxDepthReachedOnProp, maxDepthReachedAt, maxDepthReachedFromParent]) =>
    `Max depth (${maxDepthReachedAt}) reached on ${maxDepthReachedFromParent}.${maxDepthReachedOnProp}`;
const lastPartWarning = (entity: string) => `${entity} doesn't have any more properties availables`;
const cantBeNestedWarning = (entity: string) => `${entity} can't be nested`;

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
    const { entities, globalMaxDepth } = useContext(SubresourcePlaygroundContext);

    const { hasReachedMaxDepth, maxDepthInfos, maxDepthReachedOnIndex } = getMaxDepthData({
        route,
        globalMaxDepth,
        entities,
        entity,
    });

    const lastPart = route[route.length - 1] || entity;
    const lastPartProperties = (entities[lastPart]?.properties || []).filter((prop) => entities[prop].canBeNested);

    const hasNoProperties = !lastPartProperties.length;
    const cantBeNested = route.length && !entities[lastPart].canHaveNested;
    const isDisabled = hasReachedMaxDepth || hasNoProperties || cantBeNested;

    // Dispaly correct warning based on disabled condition
    const disabledWarning = isDisabled
        ? hasReachedMaxDepth
            ? maxDepthWarning(maxDepthInfos)
            : hasNoProperties
            ? lastPartWarning(lastPart)
            : cantBeNested
            ? cantBeNestedWarning(lastPart)
            : ""
        : "";
    // `Max depth (${maxDepthReachedAt}) reached on ${maxDepthReachedFromParent}.${maxDepthReachedOnProp}`

    return (
        <Flex direction="row" alignItems="center" width="fit-content" key={entity + routeIndex}>
            <Box as="span" mr="2">
                {entity}
            </Box>
            {route.map((subresource, subresourceIndex) => (
                <SubresourcePart
                    key={subresourceIndex}
                    {...{
                        entity,
                        route,
                        routeIndex,
                        setSubresourceAt,
                        subresource,
                        index: subresourceIndex,
                        isMaxDepthReached: subresourceIndex === maxDepthReachedOnIndex,
                    }}
                />
            ))}
            {isDisabled ? (
                <Tooltip hasArrow aria-label={disabledWarning} label={disabledWarning} placement="bottom">
                    <Flex width="28px" justifyContent="center" alignItems="center">
                        <Icon name="warning" color="yellow.500" />
                    </Flex>
                </Tooltip>
            ) : (
                <Box position="relative">
                    <Menu>
                        <MenuButton
                            as={(props) => (
                                <Tooltip
                                    hasArrow
                                    aria-label={"Add subresource"}
                                    label={"Add subresource"}
                                    placement="bottom"
                                >
                                    <Button
                                        {...props}
                                        variant="ghost"
                                        aria-label="Add subresource"
                                        size="xs"
                                        isDisabled={isDisabled}
                                    />
                                </Tooltip>
                            )}
                        >
                            <Icon name="add" />
                        </MenuButton>
                        <MenuList>
                            {/* TODO Disable part when it would lead to a duplicated route */}
                            {lastPartProperties.map((name) => (
                                <MenuItem key={name} onClick={() => addSubresource(entity, routeIndex, name)}>
                                    {name}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Box>
            )}

            <Tooltip
                hasArrow
                aria-label={"Remove last subresource"}
                label={"Remove last subresource"}
                placement="bottom"
            >
                <IconButton
                    variant="ghost"
                    aria-label="Remove last subresource"
                    icon="delete"
                    size="xs"
                    onClick={() => removeLastSubresource(entity, routeIndex)}
                />
            </Tooltip>
        </Flex>
    );
};

type SubresourcePartProps = Pick<SubresourceRouteProps, "setSubresourceAt" | "entity" | "route" | "routeIndex"> & {
    subresource: string;
    index: number;
    isMaxDepthReached: boolean;
};
const SubresourcePart = ({
    entity,
    route,
    routeIndex,
    setSubresourceAt,
    subresource,
    index,
    isMaxDepthReached,
}: SubresourcePartProps) => {
    const { entities } = useContext(SubresourcePlaygroundContext);
    const prevPart = route[index - 1] || entity;
    const prevPartProperties = (entities[prevPart]?.properties || []).filter((prop) => entities[prop].canBeNested);

    return (
        <Flex key={index} alignItems="center">
            <Box as="span" mx="1">
                /
            </Box>

            <Stack alignItems="center" direction="row" shouldWrapChildren>
                <Menu key={"editSub" + entity + routeIndex + index}>
                    <MenuButton
                        as={(props) => (
                            <Button
                                {...props}
                                variant="ghost"
                                aria-label="Edit subresource"
                                padding="2"
                                color={isMaxDepthReached && "yellow.400"}
                            />
                        )}
                    >
                        <Tooltip
                            hasArrow
                            aria-label={"Change subresource"}
                            label={"Change subresource"}
                            placement="bottom"
                        >
                            {subresource}
                        </Tooltip>
                    </MenuButton>
                    <MenuList zIndex={10}>
                        {prevPartProperties.map((item, i) => (
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
