import * as vscode from "vscode";

/******************************************************************************************
 *                                   Auxiliary Functions                                  *
 ******************************************************************************************/

/**
 * Create the list of arguments for the Julia function documentation given the function
 * declaration in `fundDecl`.
 * 
 * @param funcDecl Function declarations in one line.
 * @returns A string with the argument declaration.
 */
function createArgsInfo(funcDecl: string): string[] {
  const output: string[] = [];

  const paramsMatch = funcDecl.match(/\((.*?)\)/);
  if (!paramsMatch) return output;

  let parameters = paramsMatch[1];
  if (parameters.length === 0) return output;

  let [args, kwargs] = parameters.split(';');
  kwargs = kwargs || "";

  // == Parse Arguments ====================================================================

  if (args) {
    // First, we need to place the anchors for the composed types to remove the
    // constructions like `Union{Nothing, Float64}`. This procedure is required because we
    // filter for `, ` to split the arguments afterwards.

    let [modFuncDecl, typeAnchors] = placeComposedTypeAnchors(args);
    const argList = modFuncDecl.split(',').map(s => s.trim()).filter(s => s.length > 0);

    let firstArg: boolean = true;

    argList.forEach((arg) => {
      if (firstArg) {
        output.push("# Arguments\n");
        firstArg = false;
      }

      // Get the argument name.
      let argName = arg.replace(/\s*=[^=]*$/, "");

      // Check if we have a composed type here. If so, replace the anchor with the type
      // value.
      if (argName.includes("!__TYPE_ANCHOR__!") && typeAnchors.length > 0) {
        argName = argName.replace("!__TYPE_ANCHOR__!", typeAnchors.shift()!);
      }

      output.push(`- \`${argName}\`: !__PLACEHOLDER(Argument description)__!`);

      // If we have default value, add the information to the output.
      const defaultMatch = arg.match(/\s*=\s*(.*)$/);

      if (defaultMatch) {
        output.push(`    (**Default**: \`${defaultMatch[1]}\`)`);
      }
    });
  }

  // == Parse Keywords =====================================================================

  if (kwargs.trim().length > 0) {
    // First, we need to place the anchors for the composed types to remove the
    // constructions like `Union{Nothing, Float64}`. This procedure is required because we
    // filter for `, ` to split the arguments afterwards.

    let [modKwargs, typeAnchors] = placeComposedTypeAnchors(kwargs);
    const kwargList = modKwargs.split(',').map(s => s.trim()).filter(s => s.length > 0);

    let firstKwarg: boolean = true;

    kwargList.forEach((kwarg) => {
      if (firstKwarg) {
        if (args) output.push("");

        output.push("# Keywords\n");
        firstKwarg = false;
      }

      // Get keyword name.
      let kwargName = kwarg.replace(/\s*=[^=]*$/, '');

      // Check if we have a composed type here. If so, replace the anchor with the type
      // value.
      if (kwargName.includes("!__TYPE_ANCHOR__!") && typeAnchors.length > 0) {
        kwargName = kwargName.replace("!__TYPE_ANCHOR__!", typeAnchors.shift()!);
      }

      output.push(`- \`${kwargName}\`: !__PLACEHOLDER(Keyword description)__!`);

      // If we have default value, add the information to the output.
      const defaultMatch = kwarg.match(/\s*=\s*(.*)$/);

      if (defaultMatch) {
        output.push(`    (**Default**: \`${defaultMatch[1]}\`)`);
      }
    });
  }

  return output;
}

/**
 * 
 * @param lines Lines with the Julia function declaration.
 * @returns Lines with the Julia function docstring.
 */
function createJuliaFuncDoc(lines: string[]): string[] {
  const funcDecl = joinFunctionDeclaration(lines);
  const output: string[] = [];

  output.push('"""');
  output.push(`    ${suppressKwargs(funcDecl)} -> !__PLACEHOLDER(Return type)__!`);
  output.push("");
  output.push("!__PLACEHOLDER(Description of the function)__!");

  const argsInfo = createArgsInfo(funcDecl);

  if (argsInfo.length > 0) {
    output.push("");
    argsInfo.forEach(line => output.push(line));
  }

  output.push('"""');
  return output;
}

/**
 * Joins multiple lines of a function declaration into a single line.
 * @param lines Lines of the function declaration.
 * @returns Joined function declaration.
 */
function joinFunctionDeclaration(lines: string[]): string {
  // Output text that contains the function declaration in a single line.
  let funcDecl = "";
  
  // First, concatenate all lines into a single line, removing extra spaces.
  lines.forEach(line => {
      // Strip all multiple spaces and trim leading/trailing spaces.
      let v = line.replace(/\s+/g, ' ').trim();

      if (v.length === 0) return;
      
      // Check if we need to add a space before appending the next part.
      if (funcDecl.length > 0) {
        const lastChar  = funcDecl.slice(-1);
        const firstChar = v[0];

        if (lastChar !== '(' && lastChar !== '{' && firstChar !== ')' && firstChar !== '}') {
          funcDecl += ' ';
        }
      }

      funcDecl += v;
  });

  // Remove the word 'function' and change 'macro' to '@'.
  if (funcDecl.startsWith("function ")) {
    funcDecl = funcDecl.replace(/^function\s*/, '');
  } else if (funcDecl.startsWith("macro ")) {
    funcDecl = funcDecl.replace(/^macro\s*/, '@');
  }

  return funcDecl;
}

/**
 * Place anchors for composed types in the function declaration.
 * 
 * This function replaces the text inside composed types like `Union{Nothing, Float64}` with
 * the anchor `!__TYPE_ANCHOR__!`. The replaced text is added to a table with is returned
 * together with the modified string. We used this function to pre-process the function
 * declaration so that we can split the arguments by searching for `,`.
 *
 * @param funcDecl Function declaration in one line.
 * @returns An array with the modified string with the type anchors and a list of the
 *          replaced values.
 */
function placeComposedTypeAnchors(funcDecl: string): [string, string[]] {
  const values: string[] = [];
  const regex = /\{([^}]*)\}/g;

  let match: RegExpExecArray | null;

  while ((match = regex.exec(funcDecl)) !== null) {
    values.push(match[1]);
  }

  const modified = funcDecl.replace(/\{([^}]*)\}/g, "{!__TYPE_ANCHOR__!}");

  return [modified, values];
}

/**
 * Replace the keyword arguments in the one-line function declaration `funcDecl` with
 * `kwargs...`.
 *
 * @param funcDecl Function declaration in one line.
 * @returns Function declaration without keyword arguments.
 */
function suppressKwargs(funcDecl: string): string {
  return funcDecl.replace(/;.*$/, "; kwargs...)");
}

/******************************************************************************************
 *                                 Visual Studio Code API                                 *
 ******************************************************************************************/

/**
 * Check if VSCodeVim is installed and active.
 */
function isVSCodeVimActive(): boolean {
  const extension = vscode.extensions.getExtension("vscodevim.vim");
  return extension !== undefined && extension.isActive;
}

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "julia-docstrings.insertJuliaDocumentation",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
      }

      const vimActive = isVSCodeVimActive();

      // Get selected lines or current line if no selection.
      let startLine: number, endLine: number;

      if (!editor.selection.isEmpty) {
        startLine = editor.selection.start.line;
        endLine   = editor.selection.end.line;
      } else {
        startLine = editor.selection.start.line;
        endLine   = startLine;
      }

      // If VSCodeVim is active, we need to switch to insert mode at the start of the line.
      // Otherwise the snippet insertion may not work as expected.
      if (vimActive) {
        await vscode.commands.executeCommand("vim.remap", {
          after: ["escape"]
        });

        const pos0 = new vscode.Position(startLine, 0);
        editor.selection = new vscode.Selection(pos0, pos0);

        await vscode.commands.executeCommand("vim.remap", {
          after: ["i"]
        });

        // We need to wait for the mode change to take effect.
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Capture all the lines.
      const lines = [];
      for (let i = startLine; i <= endLine; i++) {
        lines.push(editor.document.lineAt(i).text);
      }

      // Create the documentation.
      const docLines = createJuliaFuncDoc(lines);

      // Convert `!__PLACEHOLDER(Description)__!` to numbered tabstops.
      let counter = 1;
      const withTabstops = docLines.map(line =>
        line.replace(/!__PLACEHOLDER\((.*?)\)__!/g, (_, desc) => `\${${counter++}:${desc}}`)
      );

      // Ensure a final cursor position
      withTabstops.push("$0");

      const snippet = new vscode.SnippetString(withTabstops.join('\n'));

      await editor.insertSnippet(snippet, new vscode.Position(startLine, 0));
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() { }