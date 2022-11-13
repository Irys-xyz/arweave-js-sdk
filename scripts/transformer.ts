const typescript = require("typescript");
const path = require("path");
module.exports = (_) => (transformationContext) => (sourceFile) => {
    function visitNode(node) {
        if (shouldMutateModuleSpecifier(node)) {
            const factory = transformationContext.factory;
            if (typescript.isImportDeclaration(node)) {
                const newModuleSpecifier = factory.createStringLiteral(`${node.moduleSpecifier.text}.mjs`);
                node = factory.updateImportDeclaration(node, node.decorators, node.modifiers,
                    node.importClause, newModuleSpecifier, node.assertClause);
            }
            else if (typescript.isExportDeclaration(node)) {
                const newModuleSpecifier = factory.createStringLiteral(`${node.moduleSpecifier.text}.mjs`);
                node = factory.updateExportDeclaration(node, node.decorators, node.modifiers, node.isTypeOnly,
                    node.exportClause, newModuleSpecifier, node.assertClause);
            }
        }
        return typescript.visitEachChild(node, visitNode, transformationContext);
    }
    function shouldMutateModuleSpecifier(node) {
        if (!typescript.isImportDeclaration(node) && !typescript.isExportDeclaration(node))
            return false;
        if (node.moduleSpecifier === undefined)
            return false;
        // only when module specifier is valid
        if (!typescript.isStringLiteral(node.moduleSpecifier))
            return false;
        // only when path is relative
        if (!node.moduleSpecifier.text.startsWith('./') && !node.moduleSpecifier.text.startsWith('../'))
            return false;
        // only when module specifier has no extension
        if (path.extname(node.moduleSpecifier.text) !== '' &&
            !node.moduleSpecifier.text.endsWith('/babel.config'))
            return false;
        return true;
    }
    return typescript.visitNode(sourceFile, visitNode);
};