import * as ts from "typescript";
import { writeFileSync } from "fs";

interface Symbol {
    name: string;
    kind: string;
    type?: string;
    children?: Symbol;
}


function createSymbolTable(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let checker = program.getTypeChecker();
    let output: Symbol[] = [];

    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
            visit(sourceFile, []);
        }
    }

    function visit(node: ts.Node, scope: string[]) {
        let newScope = scope;
        if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name!);
            if (symbol) {
                newScope = [...scope, symbol.getName()];
                if (!output[newScope.join(".")]) {
                    console.log(newScope)
                    output[newScope.join(".")] = [];
                }
            }
        }
        if (ts.isVariableDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name!);
            if (symbol) {
                let type = checker.getTypeAtLocation(node);
                let variableInfo: Symbol = {
                    name: symbol.getName(),
                    kind: ts.SyntaxKind[node.kind],
                    type: checker.typeToString(type)
                };
                if (!output[newScope.join(".")]) {
                    output[newScope.join(".")] = [];
                }
                output[newScope.join(".")].children.push(variableInfo);
            }
        }
        ts.forEachChild(node, node => visit(node, newScope));
    }

    writeFileSync("symbolTable.json", JSON.stringify(output, null, 2));
}

let fileNames = process.argv.slice(2);
createSymbolTable(fileNames, { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });
