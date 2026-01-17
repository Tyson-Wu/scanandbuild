# Scan and Build

This is a VS Code extension that scans the directory structure of your project based on a configuration file and generates the directory structure in a text file.

## Features
- Scan project directories.
- Export directory structure to a `.txt` file.
- Configurable with a `.vscode/directory_structure_config.json` file.

## Installation

1. Clone the repository.
2. Open the project in Visual Studio Code.
3. Run `F5` to test the extension locally.

## Configuration

- **include**: Directories to include in the scan.
- **exclude**: Directories to exclude from the scan.

Example `.vscode/directory_structure_config.json`:

```json
{
    "include": [
        "src",
        "assets"
    ],
    "exclude": [
        "node_modules",
        "Library"
    ]
}
