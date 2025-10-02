import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private clickHandler?: () => void;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        
        this.statusBarItem.command = 'quicktick.statusBarClicked';
        this.statusBarItem.text = '📝 Todos (0)';
        this.statusBarItem.tooltip = 'QuickTick - Click to open';
        this.statusBarItem.show();
        
        vscode.commands.registerCommand('quicktick.statusBarClicked', () => {
            if (this.clickHandler) {
                this.clickHandler();
            }
        });
    }

    update(total: number, completed: number): void {
        const pending = total - completed;
        let icon = '📝';
        let color: string | undefined;
        let tooltip = `QuickTick: ${pending} active, ${completed} completed`;

        if (total === 0) {
            this.statusBarItem.text = `${icon} Todos (0)`;
            this.statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
            this.statusBarItem.tooltip = 'No todos yet - Click to add';
        } else if (pending === 0) {
            icon = '✅';
            this.statusBarItem.text = `${icon} All done!`;
            this.statusBarItem.color = new vscode.ThemeColor('terminal.ansiGreen');
            this.statusBarItem.tooltip = 'All todos completed!';
        } else {
            if (pending > 10) {
                icon = '🔥';
                color = 'statusBarItem.errorBackground';
                tooltip += ' - Many pending todos!';
            } else if (pending > 5) {
                icon = '⚠️';
                color = 'statusBarItem.warningBackground';
            }
            
            this.statusBarItem.text = `${icon} Todos (${pending})`;
            
            if (color) {
                this.statusBarItem.backgroundColor = new vscode.ThemeColor(color);
            } else {
                this.statusBarItem.backgroundColor = undefined;
            }
            
            this.statusBarItem.tooltip = tooltip;
        }
    }

    onDidClick(handler: () => void): void {
        this.clickHandler = handler;
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}