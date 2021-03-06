import { AddIcon } from "@chakra-ui/icons";
import {
    Checkbox,
    CheckboxGroup,
    Editable,
    EditableInput,
    EditablePreview,
    Flex,
    FormLabel,
    Grid,
    IconButton,
    Stack,
    Switch,
    Tag,
    TagCloseButton,
    TagLabel,
    Tooltip,
} from "@chakra-ui/react";
import { ChangeEvent, useContext } from "react";

import { SubresourcePlaygroundContext } from "./helpers";

export function PropsByEntities() {
    const { entityNames } = useContext(SubresourcePlaygroundContext);

    return (
        <Stack direction="row" spacing="50px" shouldWrapChildren flexWrap="wrap">
            {entityNames.map((item, i) => (
                <EntityPropList key={item + i} item={item} />
            ))}
        </Stack>
    );
}

function BoolOption({ item, name }) {
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
}

function EntityName({ item }) {
    const { removeEntity } = useContext(SubresourcePlaygroundContext);
    return (
        <Tag size="sm" rounded="full" variant="solid" colorScheme="cyan">
            <TagLabel> {item}</TagLabel>
            <TagCloseButton onClick={() => removeEntity(item)} />
        </Tag>
    );
}

function EntityProp({ item, entity, setMaxDepth }) {
    const { entities } = useContext(SubresourcePlaygroundContext);

    return (
        <>
            <Checkbox value={entity} defaultIsChecked={entities[item].properties.includes(entity)}>
                {entity}
                {item === entity && " (Recursive)"}
            </Checkbox>
            {entities[item].properties.includes(entity) && (
                <Editable placeholder="Max depth" defaultValue={entities[item].maxDepths[entity] as any}>
                    {({ isEditing, onEdit }) => (
                        <>
                            {!isEditing && entities[item].maxDepths[entity] && (
                                <span onClick={onEdit}>Max depth: </span>
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
}

function EntityPropList({ item }) {
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
                        icon={<AddIcon />}
                        size="xs"
                        onClick={() => addRoute(item)}
                    />
                </Tooltip>
                <EntityName item={item} />
            </Stack>
            <Flex direction="column">
                <BoolOption item={item} name="canHaveNested" />
                <BoolOption item={item} name="canBeNested" />
                <BoolOption item={item} name="shouldAllowCircular" />
            </Flex>
            <CheckboxGroup
                defaultValue={entities[item].properties}
                onChange={(value) => setProperties(item, value as string[])}
            >
                <Stack direction="column" mb="4">
                    {entityNames
                        .filter((entity) => (!entities[item].shouldAllowCircular ? entity !== item : true))
                        .map((entity, i) => (
                            <EntityProp key={entity + i} {...{ item, setMaxDepth, entity, i }} />
                        ))}
                </Stack>
            </CheckboxGroup>
        </Stack>
    );
}
