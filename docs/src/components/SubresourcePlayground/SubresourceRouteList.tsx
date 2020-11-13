import {
    Accordion,
    Flex,
    AccordionItem,
    AccordionHeader,
    Box,
    AccordionIcon,
    AccordionPanel,
    Tooltip,
    Icon,
    Menu,
    MenuButton,
    Button,
    MenuList,
    MenuItem,
    IconButton,
    Stack,
} from "@chakra-ui/core";
import { useContext } from "react";
import {
    SubresourcePlaygroundContext,
    setValueAt,
    addValue,
    getMaxDepthData,
    maxDepthWarning,
    lastPartWarning,
    cantHaveNestedWarning,
    allSubRoutesAlreadyAddedWarning,
} from "./helpers";

export function SubresourceRouteList() {
    const { entities, entityNames, setRoutes } = useContext(SubresourcePlaygroundContext);

    const entitiesWithRoutes = entityNames.filter((entity) => entities[entity].routes.length);

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
                {entitiesWithRoutes.map((entity, i) => (
                    <AccordionItem
                        defaultIsOpen={false}
                        key={i}
                        borderTop={!i && "none"}
                        borderBottom={i === entitiesWithRoutes.length - 1 && "none"}
                    >
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
}

export type SubresourceRouteProps = {
    addSubresource: (entity: string, routeIndex: number, subresource: string) => void;
    removeLastSubresource: (entity: string, routeIndex: number) => void;
    setSubresourceAt: (entity: string, subresource: string, routeIndex: number, propIndex: number) => void;
    entity: string;
    route: string[];
    routeIndex: number;
};
function SubresourceRoute({
    entity,
    route,
    routeIndex,
    addSubresource,
    removeLastSubresource,
    setSubresourceAt,
}: SubresourceRouteProps) {
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

    // Display correct warning based on disabled condition
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
}

type SubresourcePartProps = Pick<SubresourceRouteProps, "setSubresourceAt" | "entity" | "route" | "routeIndex"> & {
    subresource: string;
    index: number;
    isMaxDepthReached: boolean;
};
function SubresourcePart({
    entity,
    route,
    routeIndex,
    setSubresourceAt,
    subresource,
    index,
    isMaxDepthReached,
}: SubresourcePartProps) {
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
}
