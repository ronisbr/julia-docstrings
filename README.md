# Julia DocStrings for VSCode

This package contains a simple extension to provide a skeleton of docstring for some objects
in Julia language.

## Features

We currently support the following objects:

- Functions.
- Macros.

## Usage

First, select the declaration of the function you desire to add the docstring. After that,
open the Command Pallete (`Cmd+Shift+P` or `Ctrl+Shift+P`) and execute the action `Insert
Julia Documentation`. The docstring will be placed above the selected declaration as a
snippet where you can fill the descriptions.

## Examples

By applying this action when the following text is selected:

```text
function my_function(x::Int, y::Int, z::Int = 3; verbose::Bool = false)
```

The following docstring will be added:

```text
"""
    my_function(x::Int, y::Int, z::Int = 3; kwargs...) -> <Return type>

<Description of the function>

# Arguments

- `x::Int`: <Argument description>
- `y::Int`: <Argument description>
- `z::Int`: <Argument description>
    (**Default**: `3`)
# Keywords

- `verbose::Bool`: <Keyword description>
    (**Default**: `false`)
"""
```

where all the text between `<>` represent the VSCode snippet placeholders.