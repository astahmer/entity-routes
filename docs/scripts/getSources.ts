import path from "path";

import {
    ExportGetableNode,
    FunctionDeclaration,
    ImplementedKindToNodeMappings,
    KindToNodeMappings,
    NamedNode,
    Node,
    Project,
    SyntaxKind,
    ts,
} from "ts-morph";
import { Application, JSONOutput } from "typedoc";
import { ModuleKind, ScriptTarget } from "typescript";

const docsRootPath = process.cwd();
const rootPath = path.join(docsRootPath, "../");

const srcPath = path.join(rootPath, "./src");
const docsJsonPath = path.join(docsRootPath, "./docs.json");

const getTypeDoc = () => require(docsJsonPath) as JSONOutput.ProjectReflection;

function getTypedocJson() {
    // const file = getSource()
    const json = getTypeDoc();
    console.log(json);
}

// getTypedocJson();

function makeTypedoc() {
    const app = new Application();
    app.bootstrap({
        mode: "library",
        logger: "console",
        target: ScriptTarget.ES5,
        module: ModuleKind.CommonJS,
        name: "typedoc",
        ignoreCompilerErrors: true,
        // disableSources: true,
    });

    const input = app.expandInputFiles([srcPath]);
    const project = app.convert(input);
    const options = project.findReflectionByName("EntityRouteOptions");
    console.log(options.sources);
}

// makeTypedoc();

function getProjectSource() {
    const project = new Project({
        tsConfigFilePath: path.join(rootPath, "./tsconfig.json"),
        skipFileDependencyResolution: true,
    });

    type FilterFlags<Base, Condition> = {
        [Key in keyof Base]: Base[Key] extends Condition ? Key : never;
    };
    type AllowedNames<Base, Condition> = FilterFlags<Base, Condition>[keyof Base];
    type SubType<Base, Condition> = Pick<Base, AllowedNames<Base, Condition>>;

    type ExportableNamedNodeEnum = keyof SubType<ImplementedKindToNodeMappings, ExportGetableNode & NamedNode>;
    type ExportableNamedNode = KindToNodeMappings[ExportableNamedNodeEnum];

    type ExportableSyntaxKind = keyof SubType<ImplementedKindToNodeMappings, ExportGetableNode>;
    // type ExportableNode = KindToNodeMappings[ExportableSyntaxKind];

    const getAllExported = <K extends ExportableSyntaxKind>(kind: K) =>
        sourceFiles.flatMap((src) => src.getDescendantsOfKind(kind).filter((child) => child.isExported()));

    type SourceData = {
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
    const getSourceData = (node: Node): SourceData => {
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
    };

    const sourceFiles = project.getSourceFiles();
    console.log(sourceFiles.length);
    // console.log(sourceFiles.map((item) => item.getBaseName()));
    const getAllExportedOfKinds = (kinds: SyntaxKind[]) => kinds.flatMap(getAllExported);
    const childs = getAllExportedOfKinds([
        SyntaxKind.EnumDeclaration,
        SyntaxKind.ClassDeclaration,
        SyntaxKind.InterfaceDeclaration,
        SyntaxKind.TypeAliasDeclaration,
        SyntaxKind.FunctionDeclaration,
        SyntaxKind.VariableDeclaration,
    ]);

    const childsData = childs.map(getSourceData);

    const getName = (item: SourceData) => item.name + "#" + item.filePath;
    const names = childsData.map(getName);
    console.log(names.length);
    const getDuplicates = <T = any>(arr: T[], identifierFn: (data: T) => string) =>
        arr.filter((data, i) => arr.map(identifierFn).indexOf(identifierFn(data)) !== i);
    // const duplicates = childsData.filter((data, i) => childsData.map(getName).indexOf(getName(data)) !== i);
    const duplicates = getDuplicates(childsData, getName);
    const implementationsData = Array.from(new Set(duplicates.map(getName))).map((name) => {
        const node = duplicates.find((data) => getName(data) === name).getNode() as FunctionDeclaration;
        const implementation = node.isImplementation() ? node : node.getImplementation();
        return getSourceData(implementation);
    });
    const implementationNames = implementationsData.map(getName);

    const sourceDatas = childsData
        .filter((data) => !implementationNames.find((name) => name === getName(data)))
        .concat(implementationsData);
    const definitions = new Map(sourceDatas.map((data) => [data.name, data]));
    console.log(definitions.size);
    console.log(definitions.get("COMPARISON_OPERATOR"));
    return;

    // const childs: ExportableNode[] = sourceFiles
    //     .flatMap((src) =>
    //         src.forEachChild((node) => {
    //             // if (!Node.isNameableNode(node) || !("isExported" in node) || !(node as any).isExported()) return;
    //             // if (!("isExported" in node) || !(node as any).isExported()) return;

    //             if (
    //                 Node.isEnumDeclaration(node) ||
    //                 Node.isClassDeclaration(node) ||
    //                 Node.isInterfaceDeclaration(node) ||
    //                 Node.isTypeAliasDeclaration(node) ||
    //                 Node.isFunctionDeclaration(node)
    //             ) {
    //                 return node;
    //             }
    //         })
    //     )
    //     .filter(Boolean);
    // console.log(childs.map(getName));
    // console.log("childs", childs.length);
    // return;
}

getProjectSource();
