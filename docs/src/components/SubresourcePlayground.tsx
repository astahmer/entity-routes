import React, { useState, useRef, createContext, useContext, ChangeEvent, useMemo } from "react";
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
    Accordion,
    AccordionHeader,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
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
    entityRoutes: Record<string, string[]>;
    addEntity: (name: string) => void;
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
    const resetEntities = () => {
        resetKey++;
        setEntities(makeRecordFromKeys(baseEntityNames, defaultEntity));
    };

    const entityNames = Object.keys(entities);
    const entityRoutes = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(entities).map(([name, entity]) => [name, entity.routes.map((route) => route.join("_"))])
            ),
        [entities]
    );

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
    const generateRoutes = () => {
        // Recursively add every nested route possible from that path on that entity
        function addNestedRoutes(entity: string, subresource: string, route: string[], routes: string[][]) {
            const currentPath = route.concat(subresource);
            const { hasReachedMaxDepth } = getMaxDepthData({ entity, route, globalMaxDepth, entities });

            const cantHaveNested = route.length && !entities[route[route.length - 1]].canHaveNested;
            const cantBeNested = route.length && !entities[subresource].canBeNested;
            if (hasReachedMaxDepth || cantHaveNested || cantBeNested) {
                routes.push(route);
                return;
            }

            routes.push(currentPath);

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
        entityRoutes,
        addEntity,
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
                <Divider my="0" />
                <SubresourceRouteList />
                {/* <Debug json={entities} /> */}
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
    const { entities, entityNames, addRoute, resetEntities, setEntities } = useContext(SubresourcePlaygroundContext);
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
};

const PropsByEntities = () => {
    const ctx = useContext(SubresourcePlaygroundContext);

    return (
        <Stack direction="row" spacing="50px" shouldWrapChildren flexWrap="wrap">
            {ctx.entityNames.map((item, i) => (
                <EntityPropList key={item + i} item={item} />
            ))}
        </Stack>
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
    const { removeEntity } = useContext(SubresourcePlaygroundContext);
    return (
        <Tag size="sm" rounded="full" variant="solid" variantColor="cyan">
            <TagLabel> {item}</TagLabel>
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
    const { entities, entityNames, addRoute, setProperties, setMaxDepths } = useContext(SubresourcePlaygroundContext);

    const setMaxDepth = (entity: string, property: string, maxDepth: number) =>
        setMaxDepths(entity, {
            ...entities[entity].maxDepths,
            [property]: typeof maxDepth === "string" ? Number(maxDepth) : maxDepth,
        });

    return (
        <Stack direction="column" alignItems="center" shouldWrapChildren>
            <Stack direction="row">
                <Tooltip hasArrow aria-label={`Add ${item} route`} label={`Add ${item} route`} placement="bottom">
                    <IconButton
                        variant="ghost"
                        aria-label={`Add ${item} route`}
                        icon="add"
                        size="xs"
                        onClick={() => addRoute(item)}
                    />
                </Tooltip>
                <EntityName item={item} />
            </Stack>
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
        <Accordion allowMultiple>
            <Flex direction="column">
                {entityNames.map((entity, i) => (
                    <AccordionItem defaultIsOpen key={i} border={!i && "none"}>
                        <AccordionHeader>
                            <Box flex="1" textAlign="left">
                                {entity} routes
                            </Box>
                            <AccordionIcon />
                        </AccordionHeader>
                        <AccordionPanel pb={1}>
                            {entities[entity].routes.map((route, routeIndex) => (
                                <SubresourceRoute
                                    key={entity + routeIndex}
                                    {...{
                                        entity,
                                        addSubresource,
                                        removeLastSubresource,
                                        setSubresourceAt,
                                        route,
                                        routeIndex,
                                    }}
                                />
                            ))}
                        </AccordionPanel>
                    </AccordionItem>
                ))}
            </Flex>
        </Accordion>
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

    const maxDepthReachedOnIndex = relativeMaxDepths.findIndex(([_, maxDepth]) => currentDepth > maxDepth);
    const maxDepthInfos = maxDepths[maxDepthReachedOnIndex];
    const hasReachedMaxDepth = maxDepthReachedOnIndex !== -1;

    return { hasReachedMaxDepth, maxDepthInfos, maxDepthReachedOnIndex };
}

const maxDepthWarning = ([maxDepthReachedOnProp, maxDepthReachedAt, maxDepthReachedFromParent]) =>
    `Max depth (${maxDepthReachedAt}) reached on ${maxDepthReachedFromParent}.${maxDepthReachedOnProp}`;
const lastPartWarning = (entity: string) => `${entity} doesn't have any more properties availables`;
const cantHaveNestedWarning = (entity: string) => `${entity} can't be nested`;
const allSubRoutesAlreadyAddedWarning = () => `All sub routes are already added`;

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
    const { entities, entityRoutes, globalMaxDepth } = useContext(SubresourcePlaygroundContext);

    const { hasReachedMaxDepth, maxDepthInfos, maxDepthReachedOnIndex } = getMaxDepthData({
        route,
        globalMaxDepth,
        entities,
        entity,
    });

    const lastPart = route[route.length - 1] || entity;
    const lastPartProperties = (entities[lastPart]?.properties || []).filter((prop) => entities[prop].canBeNested);

    const hasNoProperties = !lastPartProperties.length;
    const cantHaveNested = route.length && !entities[lastPart].canHaveNested;
    const allSubRoutesAlreadyAdded = lastPartProperties.every((name) =>
        entityRoutes[entity].includes(route.concat(name).join("_"))
    );
    const isDisabled = hasReachedMaxDepth || hasNoProperties || cantHaveNested || allSubRoutesAlreadyAdded;

    // Dispaly correct warning based on disabled condition
    const disabledWarning = isDisabled
        ? hasReachedMaxDepth
            ? maxDepthWarning(maxDepthInfos)
            : hasNoProperties
            ? lastPartWarning(lastPart)
            : cantHaveNested
            ? cantHaveNestedWarning(lastPart)
            : allSubRoutesAlreadyAdded
            ? allSubRoutesAlreadyAddedWarning()
            : ""
        : "";

    const removeSubresourceLabel = route.length ? "Remove last subresource" : "Remove route";

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
                            {lastPartProperties.map((name) => (
                                <MenuItem
                                    key={name}
                                    onClick={() => addSubresource(entity, routeIndex, name)}
                                    isDisabled={entityRoutes[entity].includes(route.concat(name).join("_"))}
                                >
                                    {name}
                                </MenuItem>
                            ))}
                        </MenuList>
                    </Menu>
                </Box>
            )}

            <Tooltip hasArrow aria-label={removeSubresourceLabel} label={removeSubresourceLabel} placement="bottom">
                <IconButton
                    variant="ghost"
                    aria-label={removeSubresourceLabel}
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
