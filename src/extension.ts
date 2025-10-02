import * as vscode from 'vscode';
import { TodoProvider } from './todoProvider';
import { StatusBarManager } from './statusBar';
import { TodoWebviewPanel } from './webviewPanel';

let statusBarManager: StatusBarManager;
let todoProvider: TodoProvider;
let webviewPanel: TodoWebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('QuickTick extension is now active!');
    vscode.window.showInformationMessage('QuickTick extension activated!');

    // Initialize providers
    todoProvider = new TodoProvider(context);
    statusBarManager = new StatusBarManager();

    // Update status bar with current todo count
    updateStatusBar();

    // Register commands
    const togglePanelCommand = vscode.commands.registerCommand('quicktick.togglePanel', () => {
        if (webviewPanel) {
            webviewPanel.dispose();
            webviewPanel = undefined;
        } else {
            webviewPanel = new TodoWebviewPanel(context, todoProvider);
            webviewPanel.onDidDispose(() => {
                webviewPanel = undefined;
            });
            webviewPanel.onTodoChange(() => {
                updateStatusBar();
            });
        }
    });

    const addTodoCommand = vscode.commands.registerCommand('quicktick.addTodo', async () => {
        const todoText = await vscode.window.showInputBox({
            prompt: 'Enter new todo',
            placeHolder: 'Fix bug #123...'
        });

        if (todoText) {
            todoProvider.addTodo(todoText);
            updateStatusBar();
            vscode.window.showInformationMessage(`Todo added: ${todoText}`);
            
            // If panel is open, refresh it
            if (webviewPanel) {
                webviewPanel.refresh();
            }
        }
    });

    const clearCompletedCommand = vscode.commands.registerCommand('quicktick.clearCompleted', () => {
        const count = todoProvider.clearCompleted();
        updateStatusBar();
        vscode.window.showInformationMessage(`Cleared ${count} completed todos`);
        
        if (webviewPanel) {
            webviewPanel.refresh();
        }
    });

    const resetAllCommand = vscode.commands.registerCommand('quicktick.resetAll', async () => {
        const answer = await vscode.window.showWarningMessage(
            'Are you sure you want to delete all todos?',
            'Yes',
            'No'
        );

        if (answer === 'Yes') {
            todoProvider.resetAll();
            updateStatusBar();
            vscode.window.showInformationMessage('All todos cleared');
            
            if (webviewPanel) {
                webviewPanel.refresh();
            }
        }
    });

    const exportTodosCommand = vscode.commands.registerCommand('quicktick.exportTodos', async () => {
        const markdown = todoProvider.exportAsMarkdown();
        
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file('todos.md'),
            filters: {
                'Markdown': ['md']
            }
        });

        if (uri) {
            await vscode.workspace.fs.writeFile(uri, Buffer.from(markdown));
            vscode.window.showInformationMessage(`Todos exported to ${uri.fsPath}`);
        }
    });

    // Subscribe to all commands
    context.subscriptions.push(
        togglePanelCommand,
        addTodoCommand,
        clearCompletedCommand,
        resetAllCommand,
        exportTodosCommand,
        statusBarManager
    );

    // Handle status bar click
    statusBarManager.onDidClick(() => {
        vscode.commands.executeCommand('quicktick.togglePanel');
    });

    // Update status bar when workspace changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            updateStatusBar();
        })
    );
}

function updateStatusBar() {
    const stats = todoProvider.getStats();
    statusBarManager.update(stats.total, stats.completed);
}

export function deactivate() {
    if (webviewPanel) {
        webviewPanel.dispose();
    }
}