import * as vscode from 'vscode';
import * as path from 'path';
import { TodoProvider } from './todoProvider';

export class TodoWebviewPanel {
    private panel: vscode.WebviewPanel;
    private changeHandler?: () => void;
    private disposeHandler?: () => void;

    constructor(
        private context: vscode.ExtensionContext,
        private todoProvider: TodoProvider
    ) {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        this.panel = vscode.window.createWebviewPanel(
            'quicktick',
            'QuickTick',
            columnToShowIn || vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'webview'))
                ]
            }
        );

        this.panel.webview.html = this.getWebviewContent();

        this.panel.webview.onDidReceiveMessage(
            message => this.handleMessage(message),
            undefined,
            context.subscriptions
        );

        this.panel.onDidDispose(
            () => {
                if (this.disposeHandler) {
                    this.disposeHandler();
                }
            },
            undefined,
            context.subscriptions
        );

        this.refresh();
    }

    private handleMessage(message: any): void {
        switch (message.command) {
            case 'addTodo':
                if (message.text) {
                    this.todoProvider.addTodo(message.text);
                    this.refresh();
                    this.notifyChange();
                }
                break;

            case 'toggleTodo':
                if (message.id) {
                    this.todoProvider.toggleTodo(message.id);
                    this.refresh();
                    this.notifyChange();
                }
                break;

            case 'updateTodo':
                if (message.id && message.text) {
                    this.todoProvider.updateTodo(message.id, message.text);
                    this.refresh();
                    this.notifyChange();
                }
                break;

            case 'deleteTodo':
                if (message.id) {
                    this.todoProvider.deleteTodo(message.id);
                    this.refresh();
                    this.notifyChange();
                }
                break;

            case 'clearCompleted':
                vscode.window.showWarningMessage(
                    'Clear all completed todos?',
                    'Yes',
                    'No'
                ).then(answer => {
                    if (answer === 'Yes') {
                        const count = this.todoProvider.clearCompleted();
                        this.refresh();
                        this.notifyChange();
                        vscode.window.showInformationMessage(`Cleared ${count} completed todos`);
                    }
                });
                break;

            case 'resetAll':
                vscode.window.showWarningMessage(
                    'Are you sure you want to delete all todos?',
                    'Yes',
                    'No'
                ).then(answer => {
                    if (answer === 'Yes') {
                        this.todoProvider.resetAll();
                        this.refresh();
                        this.notifyChange();
                        vscode.window.showInformationMessage('All todos cleared');
                    }
                });
                break;

            case 'requestRefresh':
                this.refresh();
                break;
        }
    }

    refresh(): void {
        const todos = this.todoProvider.getAllTodos();
        const stats = this.todoProvider.getStats();
        
        this.panel.webview.postMessage({
            command: 'updateTodos',
            todos: todos,
            stats: stats
        });
    }

    private notifyChange(): void {
        if (this.changeHandler) {
            this.changeHandler();
        }
    }

    onTodoChange(handler: () => void): void {
        this.changeHandler = handler;
    }

    onDidDispose(handler: () => void): void {
        this.disposeHandler = handler;
    }

    dispose(): void {
        this.panel.dispose();
    }

    private getWebviewContent(): string {
        const webviewPath = path.join(this.context.extensionPath, 'webview');
        const cssPath = vscode.Uri.file(path.join(webviewPath, 'style.css'));
        const jsPath = vscode.Uri.file(path.join(webviewPath, 'script.js'));
        
        const cssUri = this.panel.webview.asWebviewUri(cssPath);
        const jsUri = this.panel.webview.asWebviewUri(jsPath);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuickTick</title>
    <link href="${cssUri}" rel="stylesheet">
</head>
<body>
    <div class="container">
        <header>
            <h1>📝 QuickTick</h1>
            <div class="stats">
                <span id="stats-text">Loading...</span>
                <div class="progress-bar">
                    <div id="progress-fill" class="progress-fill"></div>
                </div>
            </div>
        </header>

        <div class="add-todo">
            <input type="text" 
                   id="new-todo-input" 
                   placeholder="Add a new todo..." 
                   autocomplete="off">
            <button id="add-button">Add</button>
        </div>

        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="active">Active</button>
            <button class="filter-btn" data-filter="completed">Completed</button>
        </div>

        <div id="todo-list" class="todo-list">
        </div>

        <div class="actions">
            <button id="clear-completed" class="action-btn">Clear Completed</button>
            <button id="reset-all" class="action-btn danger">Reset All</button>
        </div>
    </div>
    <script src="${jsUri}"></script>
</body>
</html>`;
    }
}