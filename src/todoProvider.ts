import * as vscode from 'vscode';

export interface Todo {
    id: string;
    text: string;
    completed: boolean;
    createdAt: Date;
    completedAt?: Date;
}

export interface TodoStats {
    total: number;
    completed: number;
    pending: number;
}

export class TodoProvider {
    private todos: Todo[] = [];
    private storageKey = 'quicktick.todos';
    
    constructor(private context: vscode.ExtensionContext) {
        this.loadTodos();
    }

    private loadTodos(): void {
        const stored = this.context.workspaceState.get<Todo[]>(this.storageKey);
        if (stored) {
            this.todos = stored.map(t => ({
                ...t,
                createdAt: new Date(t.createdAt),
                completedAt: t.completedAt ? new Date(t.completedAt) : undefined
            }));
        }
    }

    private saveTodos(): void {
        this.context.workspaceState.update(this.storageKey, this.todos);
    }

    getAllTodos(): Todo[] {
        return [...this.todos];
    }

    getActiveTodos(): Todo[] {
        return this.todos.filter(t => !t.completed);
    }

    getCompletedTodos(): Todo[] {
        return this.todos.filter(t => t.completed);
    }

    addTodo(text: string): Todo {
        const todo: Todo = {
            id: Date.now().toString(),
            text,
            completed: false,
            createdAt: new Date()
        };
        this.todos.unshift(todo);
        this.saveTodos();
        return todo;
    }

    toggleTodo(id: string): boolean {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date() : undefined;
            this.saveTodos();
            return true;
        }
        return false;
    }

    updateTodo(id: string, text: string): boolean {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.text = text;
            this.saveTodos();
            return true;
        }
        return false;
    }

    deleteTodo(id: string): boolean {
        const index = this.todos.findIndex(t => t.id === id);
        if (index !== -1) {
            this.todos.splice(index, 1);
            this.saveTodos();
            return true;
        }
        return false;
    }

    clearCompleted(): number {
        const completed = this.todos.filter(t => t.completed);
        this.todos = this.todos.filter(t => !t.completed);
        this.saveTodos();
        return completed.length;
    }

    resetAll(): void {
        this.todos = [];
        this.saveTodos();
    }

    getStats(): TodoStats {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        return {
            total,
            completed,
            pending: total - completed
        };
    }

    exportAsMarkdown(): string {
        let markdown = '# QuickTick Todos\n\n';
        markdown += `_Exported on ${new Date().toLocaleString()}_\n\n`;
        
        const active = this.getActiveTodos();
        const completed = this.getCompletedTodos();
        
        if (active.length > 0) {
            markdown += '## Active Todos\n\n';
            active.forEach(todo => {
                markdown += `- [ ] ${todo.text}\n`;
            });
            markdown += '\n';
        }
        
        if (completed.length > 0) {
            markdown += '## Completed Todos\n\n';
            completed.forEach(todo => {
                markdown += `- [x] ${todo.text}`;
                if (todo.completedAt) {
                    markdown += ` _(completed ${todo.completedAt.toLocaleDateString()})_`;
                }
                markdown += '\n';
            });
        }
        
        if (this.todos.length === 0) {
            markdown += '_No todos yet_\n';
        }
        
        return markdown;
    }
}