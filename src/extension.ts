import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/* =========================
 * 插件入口
 * ========================= */
export function activate(context: vscode.ExtensionContext) {

    context.subscriptions.push(
        vscode.commands.registerCommand(
            'directoryStructure.exportFolders',
            (uri?: vscode.Uri) => runExport(uri, 'folders')
        ),

        vscode.commands.registerCommand(
            'directoryStructure.exportAll',
            (uri?: vscode.Uri) => runExport(uri, 'all')
        ),

        vscode.commands.registerCommand(
            'directoryStructure.generateConfig',
            generateConfigFile
        ),

        vscode.commands.registerCommand(
            'directoryStructure.generateFromFile',
            generateFromStructureFile
        )
    );
}

/* =========================
 * 核心逻辑
 * ========================= */

async function runExport(
    uri: vscode.Uri | undefined,
    mode: 'folders' | 'all'
) {
    const root = getTargetRoot(uri);
    if (!root) {
        vscode.window.showErrorMessage('未找到有效的工作区目录');
        return;
    }

    const config = ensureConfig(root);
    const outputFile = path.join(root, '.vscode', 'directory_structure_out.txt');

    let output: string[] = [];

    scanDirectory(root, root, config, mode, output);

    fs.writeFileSync(outputFile, output.join('\n'), 'utf8');
    vscode.window.showInformationMessage(`目录结构已生成：${outputFile}`);
}

/* =========================
 * 扫描逻辑
 * ========================= */

function scanDirectory(
    baseRoot: string,
    currentPath: string,
    config: any,
    mode: 'folders' | 'all',
    output: string[]
) {
    const relative = path.relative(baseRoot, currentPath) || '.';

    if (isExcluded(relative, config.exclude)) {
        return;
    }

    output.push(relative);

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.relative(baseRoot, fullPath);

        if (entry.isDirectory()) {
            scanDirectory(baseRoot, fullPath, config, mode, output);
        } else if (mode === 'all') {
            output.push(relPath);
        }
    }
}

async function generateConfigFile() {
    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
        vscode.window.showErrorMessage('未打开工作区');
        return;
    }

    const vscodeDir = path.join(workspace.uri.fsPath, '.vscode');
    const configPath = path.join(vscodeDir, 'directory_structure_config.json');

    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
    }

    if (fs.existsSync(configPath)) {
        vscode.window.showInformationMessage('配置文件已存在');
        return;
    }

    const defaultConfig = {
        exclude: [
            "node_modules",
            ".git",
            "Library"
        ]
    };

    fs.writeFileSync(
        configPath,
        JSON.stringify(defaultConfig, null, 2),
        'utf8'
    );

    vscode.window.showInformationMessage(
        '已生成 .vscode/directory_structure_config.json'
    );
}


/* =========================
 * 根据 structure.txt 生成
 * ========================= */

async function generateFromStructureFile(uri?: vscode.Uri) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('未打开工作区');
        return;
    }

    const rootPath = workspaceFolder.uri.fsPath;
    const vscodeDir = path.join(rootPath, '.vscode');
    const structureFile = path.join(vscodeDir, 'directory_structure.txt');

    // 确保 .vscode 目录存在
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
    }

    // 如果结构文件不存在，创建模板
    if (!fs.existsSync(structureFile)) {
        const template = `# 每行一条路径
# 以 / 或 \\ 结尾表示目录
# 不带结尾表示文件

GameLogic/
GameLogic/UI/
GameLogic/UI/MainUI.lua
Framework/
Framework/Net/
Framework/Net/HttpClient.lua
`;

        fs.writeFileSync(structureFile, template, 'utf8');

        const doc = await vscode.workspace.openTextDocument(structureFile);
        await vscode.window.showTextDocument(doc);

        vscode.window.showInformationMessage(
            '未找到 directory_structure.txt，已为你创建模板文件'
        );
        return;
    }

    await applyStructureFile(structureFile, rootPath);
}

async function applyStructureFile(filePath: string, rootPath: string) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

    let createdCount = 0;

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) {
            continue;
        }

        const targetPath = path.join(rootPath, line);

        try {
            if (line.endsWith('/') || line.endsWith('\\')) {
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                    createdCount++;
                }
            } else {
                const dir = path.dirname(targetPath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                if (!fs.existsSync(targetPath)) {
                    fs.writeFileSync(targetPath, '', 'utf8');
                    createdCount++;
                }
            }
        } catch (err) {
            vscode.window.showWarningMessage(`创建失败: ${line}`);
        }
    }

    vscode.window.showInformationMessage(
        `目录结构生成完成，共创建 ${createdCount} 项`
    );
}


/* =========================
 * 配置文件
 * ========================= */

function ensureConfig(root: string): any {
    const vscodeDir = path.join(root, '.vscode');
    const configFile = path.join(vscodeDir, 'directory_structure_config.json');

    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
    }

    if (!fs.existsSync(configFile)) {
        const defaultConfig = {
            exclude: [
                "node_modules",
                ".git",
                "Library"
            ]
        };
        fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
        vscode.window.showInformationMessage('已生成默认 directory_structure_config.json');
        return defaultConfig;
    }

    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

/* =========================
 * 工具函数
 * ========================= */

function getTargetRoot(uri?: vscode.Uri): string | null {
    if (uri) {
        return uri.fsPath;
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

function isExcluded(relativePath: string, excludes: string[] = []): boolean {
    return excludes.some(ex => relativePath.startsWith(ex));
}

export function deactivate() {}
