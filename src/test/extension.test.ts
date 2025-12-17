import * as assert from "assert";
import * as vscode from "vscode";

suite("Julia DocStrings Extension Test Suite", () => {
    vscode.window.showInformationMessage("Running Julia DocStrings tests.");

    test("Extension Loading", async () => {
        const extension = vscode.extensions.getExtension("ronisbr.julia-docstrings");
        await extension!.activate();
        const commands = await vscode.commands.getCommands();

        assert.strictEqual(extension!.isActive, true);
        assert.ok(commands.includes("julia-docstrings.insertJuliaDocumentation"));
    });

    test("Document Julia Function", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "function test(a::Number, b::Union{Nothing, Float64}, c::Any; kw1::Char = 'c', kw2::Int = 1)",
            language: "julia"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(0, 0, 0, 22);

        await vscode.commands.executeCommand("julia-docstrings.insertJuliaDocumentation");

        const text = doc.getText();

        const expected = `
"""
    test(a::Number, b::Union{Nothing, Float64}, c::Any; kwargs...) -> Return type

Description of the function

# Arguments

- \`a::Number\`: Argument description
- \`b::Union{Nothing, Float64}\`: Argument description
- \`c::Any\`: Argument description

# Keywords

- \`kw1::Char\`: Keyword description
    (**Default**: \`'c'\`)
- \`kw2::Int\`: Keyword description
    (**Default**: \`1\`)
"""`;

        assert.strictEqual(text.startsWith(expected.trim()), true);
    });

    test("Document Julia Macro", async () => {
        const doc = await vscode.workspace.openTextDocument({
            content: "macro test(a, b)",
            language: "julia"
        });

        const editor = await vscode.window.showTextDocument(doc);

        // Position cursor inside parentheses.
        editor.selection = new vscode.Selection(0, 0, 0, 22);

        await vscode.commands.executeCommand("julia-docstrings.insertJuliaDocumentation");

        const text = doc.getText();

        const expected = `
"""
    @test(a, b) -> Return type

Description of the function

# Arguments

- \`a\`: Argument description
- \`b\`: Argument description
"""`;

        assert.strictEqual(text.startsWith(expected.trim()), true);
    });
});
