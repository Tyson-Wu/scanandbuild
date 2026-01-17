import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.generateDirectoryStructure', async () => {

        // 获取当前项目的根目录
        const rootPath = vscode.workspace.rootPath;
        if (!rootPath) {
            vscode.window.showErrorMessage('无法获取项目根目录');
            return;
        }

        // 获取配置文件路径
        const configFile = path.join(rootPath, '.vscode', 'directory_structure_config.json');
        
        // 读取配置文件
        let config = await getConfig(configFile);
        
        // 开始生成目录结构
        if (config) {
            await generateDirectoryStructure(rootPath, config);
        }
    });

    context.subscriptions.push(disposable);
}

// 获取配置文件内容
async function getConfig(configFile: string): Promise<any | null> {
    try {
        const fileContent = fs.readFileSync(configFile, 'utf8');
        return JSON.parse(fileContent);
    } catch (err) {
        vscode.window.showErrorMessage('无法读取配置文件');
        return null;
    }
}

// 生成目录结构并导出到文件
async function generateDirectoryStructure(rootPath: string, config: any) {
    const outputFile = path.join(rootPath, '.vscode', 'directory_structure_out.txt');

    try {
        let output = '';

        // 递归扫描目录
        await scanDirectories(rootPath, '', config, output);

        // 将目录结构写入文件
        fs.writeFileSync(outputFile, output);
        vscode.window.showInformationMessage('目录结构已生成并导出到 .vscode/directory_structure_out.txt');
    } catch (err) {
        vscode.window.showErrorMessage('生成目录结构时出错');
    }
}

// 递归扫描目录
async function scanDirectories(rootPath: string, relativePath: string, config: any, output: string) {
    const fullPath = path.join(rootPath, relativePath);

    // 检查是否排除该路径
    if (config.exclude && config.exclude.some((excludePath: string) => relativePath.startsWith(excludePath))) {
        return;
    }

    // 添加当前目录到输出
    output += `${relativePath}\n`;

    const files = fs.readdirSync(fullPath);

    for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            // 如果是目录，递归扫描
            await scanDirectories(rootPath, path.join(relativePath, file), config, output);
        } else {
            // 如果是文件，添加到输出
            output += `${path.join(relativePath, file)}\n`;
        }
    }
}

export function deactivate() {}
