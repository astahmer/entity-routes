import path from "path";

import {
    ExportGetableNode,
    FunctionDeclaration,
    ImplementedKindToNodeMappings,
    KindToNodeMappings,
    NamedNode,
    Node,
    Project,
    ProjectOptions,
    SourceFile,
    SyntaxKind,
    ts,
} from "ts-morph";

const docsRootPath = process.cwd();
const rootPath = path.join(docsRootPath, "../");
const defaultProjectOptions = {
    tsConfigFilePath: path.join(rootPath, "./tsconfig.json"),
    skipFileDependencyResolution: true,
};

function getProjectDefinitions(options: ProjectOptions) {
    const project = new Project(options);
    const sourceFiles = project.getSourceFiles();
    const definitions = getDefinitions(sourceFiles);
    console.log(definitions.size);
    console.log(definitions.get("COMPARISON_OPERATOR"));
    return;
}

getProjectDefinitions(defaultProjectOptions);

function getDefinitions(sourceFiles: SourceFile[]) {
    const getAllExported = <K extends ExportableSyntaxKind>(kind: K) =>
        sourceFiles.flatMap((src) => src.getDescendantsOfKind(kind).filter((child) => child.isExported()));
    const getAllExportedOfKinds = (kinds: SyntaxKind[]) => kinds.flatMap(getAllExported);

    // Getting exported children of kinds that we are interested in
    const childs = getAllExportedOfKinds([
        SyntaxKind.EnumDeclaration,
        SyntaxKind.ClassDeclaration,
        SyntaxKind.InterfaceDeclaration,
        SyntaxKind.TypeAliasDeclaration,
        SyntaxKind.FunctionDeclaration,
        SyntaxKind.VariableDeclaration,
    ]);

    // Remove duplicates (function overloads)
    const sourceDatas = getSourceDataWithoutOverloads(childs.map(getSourceData));
    const definitions = new Map(sourceDatas.map((data) => [data.name, data]));

    return definitions;
}

function getSourceDataWithoutOverloads(childsData: DefinitionData[]) {
    const duplicates = getDuplicates(childsData, getName);
    const implementationsData = Array.from(new Set(duplicates.map(getName))).map(getImplementationData(duplicates));
    const implementationNames = implementationsData.map(getName);

    const sourceDatas = childsData
        .filter((data) => !implementationNames.find((name) => name === getName(data)))
        .concat(implementationsData);
    return sourceDatas;
}

function getImplementationData(duplicates: DefinitionData[]): (value: string) => DefinitionData {
    return (name) => {
        const node = duplicates.find((data) => getName(data) === name).getNode() as FunctionDeclaration;
        const implementation = node.isImplementation() ? node : node.getImplementation();
        return getSourceData(implementation);
    };
}

function getName(item: DefinitionData) {
    return item.name + "#" + item.filePath;
}

function getSourceData(node: Node): DefinitionData {
    const source = node.getSourceFile();
    const start = node.getStart();

    return {
        getNode: () => node,
        name: (node as ExportableNamedNode).getName(),
        kind: Node.isVariableDeclaration(node) ? node.getInitializer().getKindName() : node.getKindName(),
        filePath: source.getFilePath(),
        fileName: source.getBaseNameWithoutExtension(),
        position: {
            ...source.getLineAndColumnAtPos(start),
            start,
            width: node.getWidth(),
        },
    };
}

type DefinitionData = {
    getNode: () => Node<ts.Node>;
    name: string;
    kind: string;
    filePath: string;
    fileName: string;
    position: {
        start: number;
        width: number;
        line: number;
        column: number;
    };
};

function getDuplicates<T = any>(arr: T[], identifierFn: (data: T) => string) {
    return arr.filter((data, i) => arr.map(identifierFn).indexOf(identifierFn(data)) !== i);
}

type FilterFlags<Base, Condition> = {
    [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
};
type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
type SubType<Base, Condition> = Pick<Base, AllowedNames<Base, Condition>>;

type ExportableNamedNodeEnum = keyof SubType<ImplementedKindToNodeMappings, ExportGetableNode & NamedNode>;
type ExportableNamedNode = KindToNodeMappings[ExportableNamedNodeEnum];

type ExportableSyntaxKind = keyof SubType<ImplementedKindToNodeMappings, ExportGetableNode>;
