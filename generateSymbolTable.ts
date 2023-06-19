// @ts-nocheck
import * as ts from "typescript";
import { writeFileSync } from "fs";

interface Symbol {
    name: string;
    kind: string;
    type?: string;
    children?: Symbol[];
}

function createSymbolTable(fileNames: string[], options: ts.CompilerOptions): void {
    let program = ts.createProgram(fileNames, options);
    let checker = program.getTypeChecker();

    let rootSymbol: Symbol = { name: "root", kind: "root", children: [] };
    let currentSymbol = rootSymbol;

    for (const sourceFile of program.getSourceFiles()) {
        if (!sourceFile.isDeclarationFile) {
            visit(sourceFile, currentSymbol);
        }
    }
    function visit(node: ts.Node, currentSymbol: Symbol) {
        if (ts.isClassDeclaration(node) || ts.isFunctionDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name!);
            if (symbol) {
                let newSymbol: Symbol = { name: symbol.getName(), kind: ts.SyntaxKind[node.kind], children: [] };
                currentSymbol.children!.push(newSymbol);
                currentSymbol = newSymbol;
                // If the node is a function declaration, process its parameters
                if (ts.isFunctionDeclaration(node)) {
                    for (const parameter of node.parameters) {
                        let paramSymbol = checker.getSymbolAtLocation(parameter.name);
                        if (paramSymbol) {
                            let type = checker.getTypeAtLocation(parameter);
                            let paramInfo: Symbol = {
                                name: paramSymbol.getName(),
                                kind: ts.SyntaxKind[parameter.kind],
                                type: checker.typeToString(type)
                            };
                            currentSymbol.children!.push(paramInfo);
                        }
                    }
                }
            }
        }
        if (ts.isVariableDeclaration(node)) {
            let symbol = checker.getSymbolAtLocation(node.name!);
            if (symbol) {
                let type = checker.getTypeAtLocation(node);
                let initializer = node.initializer ? node.initializer.getText() : undefined;
                let variableInfo: Symbol = {
                    name: symbol.getName(),
                    kind: ts.SyntaxKind[node.kind],
                    type: checker.typeToString(type),
                    value: initializer
                };
                currentSymbol.children!.push(variableInfo);
            }
        }
        ts.forEachChild(node, node => visit(node, currentSymbol));
    }

    writeFileSync("results/symbol_table.json", JSON.stringify(rootSymbol, null, 2));
}

let fileNames = process.argv.slice(2);
createSymbolTable(fileNames, { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS });