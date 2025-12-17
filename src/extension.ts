import * as vscode from "vscode";

/******************************************************************************************
 *                                       Constants                                        *
 ******************************************************************************************/

const TYPE_ANCHOR        = "!__TYPE_ANCHOR__!";
const PLACEHOLDER_PREFIX = "!__PLACEHOLDER(";
const PLACEHOLDER_SUFFIX = ")__!";

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

  const [args, kwargs] = parameters.split(';');

  // Parse Arguments
  if (args) {
    parseParameters(args, output, "# Arguments\n", "Argument");
  }

  // Parse Keywords
  if (kwargs && kwargs.trim().length > 0) {
    if (args) {
      output.push("");
    }
    parseParameters(kwargs, output, "# Keywords\n", "Keyword");
  }

  return output;
}

/**
 * Parse parameters (arguments or keywords) and add them to the output.
 *
 * @param params Parameter string to parse.
 * @param output Output array to append to.
 * @param header Section header (e.g., "# Arguments\n").
 * @param descType Type of description (e.g., "Argument" or "Keyword").
 */
function parseParameters(
  params: string,
  output: string[],
  header: string,
  descType: string
): void {
  const [modParams, typeAnchors] = placeComposedTypeAnchors(params);
  const paramList = modParams.split(',').map(s => s.trim()).filter(s => s.length > 0);

  let isFirst = true;

  paramList.forEach((param) => {
    if (isFirst) {
      output.push(header);
      isFirst = false;
    }

    // Get the parameter name (remove default value if present).
    let paramName = param.replace(/\s*=[^=]*$/, "");

    // Check if we have a composed type here. If so, replace the anchor with the type value.
    if (paramName.includes(TYPE_ANCHOR) && typeAnchors.length > 0) {
      paramName = paramName.replace(TYPE_ANCHOR, typeAnchors.shift()!);
    }

    output.push(
      `- \`${paramName}\`: ${PLACEHOLDER_PREFIX}${descType} description${PLACEHOLDER_SUFFIX}`
    );

    // If we have default value, add the information to the output.
    const defaultMatch = param.match(/\s*=\s*(.*)$/);
    if (defaultMatch) {
      output.push(`    (**Default**: \`${defaultMatch[1]}\`)`);
    }
  });
}

/**
 * Create Julia function docstring lines based on the provided function declaration lines.
 *
 * @param lines Lines with the Julia function declaration.
 * @returns Lines with the Julia function docstring.
 */
function createJuliaFuncDoc(lines: string[]): string[] {
  const funcDecl = joinFunctionDeclaration(lines);
  const output: string[] = [];

  output.push('"""');
  output.push(`    ${suppressKwargs(funcDecl)} -> ${PLACEHOLDER_PREFIX}Return type${PLACEHOLDER_SUFFIX}`);
  output.push("");
  output.push(`${PLACEHOLDER_PREFIX}Description of the function${PLACEHOLDER_SUFFIX}`);

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

  const modified = funcDecl.replace(/\{([^}]*)\}/g, `{${TYPE_ANCHOR}}`);

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
 * Check if VSCodeVim extension is installed and active.
 * @returns True if VSCodeVim is active, false otherwise.
 */
function isVSCodeVimActive(): boolean {
  const extension = vscode.extensions.getExtension("vscodevim.vim");
  return extension !== undefined && extension.isActive;
}

/**
 * Activates the Julia DocStrings extension.
 * @param context The extension context provided by VS Code.
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "julia-docstrings.insertJuliaDocumentation",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        vscode.window.showWarningMessage("No active editor found.");
        return;
      }

      // Check if the document is a Julia file
      if (editor.document.languageId !== "julia") {
        vscode.window.showWarningMessage("This command only works with Julia files.");
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

      // Validate that we have some content to work with
      const hasContent = lines.some(line => line.trim().length > 0);
      if (!hasContent) {
        vscode.window.showWarningMessage("No function declaration found in the selection.");
        return;
      }

      // Create the documentation.
      const docLines = createJuliaFuncDoc(lines);

      // Convert placeholders to numbered tabstops.
      let counter = 1;
      const placeholderRegex = new RegExp(`${PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.*?)${PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
      const withTabstops = docLines.map(line =>
        line.replace(placeholderRegex, (_, desc) => `\${${counter++}:${desc}}`)
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