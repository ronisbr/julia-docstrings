# Change Log

## v0.2.0

- ![Enhancement][badge-enhancement] Improved code maintainability by extracting magic
  strings to constants.
- ![Enhancement][badge-enhancement] Reduced code duplication by introducing a shared
  `parseParameters` function.
- ![Enhancement][badge-enhancement] Improved error messages with better user feedback.
- ![Enhancement][badge-enhancement] Added error handling for snippet insertion failures.
- ![Enhancement][badge-enhancement] Added explicit return type annotations to all functions.
- ![Enhancement][badge-enhancement] Added basic unit tests for extension activation and
  command registration.
- ![Enhancement][badge-enhancement] Converted indentation to 4 spaces for better
  readability.

## v0.1.6

- ![Enhancement][badge-enhancement] Change the command name from
  `extension.insertJuliaDocumentation` to `julia-docstrings.insertJuliaDocumentation`.

## v0.1.5

- ![Bugfix][badge-bugfix] Add new line between arguments and keywords.

## v0.1.4

- ![Bugfix][badge-bugfix] Increase the wait time for the VSCodeVim change the mode before
adding the snippet.

## v0.1.0

- Initial release

[badge-breaking]: https://img.shields.io/badge/BREAKING-red.svg
[badge-deprecation]: https://img.shields.io/badge/Deprecation-orange.svg
[badge-feature]: https://img.shields.io/badge/Feature-green.svg
[badge-enhancement]: https://img.shields.io/badge/Enhancement-blue.svg
[badge-bugfix]: https://img.shields.io/badge/Bugfix-purple.svg
[badge-info]: https://img.shields.io/badge/Info-gray.svg