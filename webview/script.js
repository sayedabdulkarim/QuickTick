(function() {
    const vscode = acquireVsCodeApi();
    
    let todos = [];
    let currentFilter = 'all';
    let editingId = null;

    const elements = {
        input: document.getElementById('new-todo-input'),
        addButton: document.getElementById('add-button'),
        todoList: document.getElementById('todo-list'),
        statsText: document.getElementById('stats-text'),
        progressFill: document.getElementById('progress-fill'),
        clearCompleted: document.getElementById('clear-completed'),
        resetAll: document.getElementById('reset-all'),
        filterButtons: document.querySelectorAll('.filter-btn')
    };

    function init() {
        setupEventListeners();
        requestRefresh();
    }

    function setupEventListeners() {
        elements.addButton.addEventListener('click', addTodo);
        elements.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTodo();
            }
        });

        elements.clearCompleted.addEventListener('click', () => {
            vscode.postMessage({ command: 'clearCompleted' });
        });

        elements.resetAll.addEventListener('click', () => {
            vscode.postMessage({ command: 'resetAll' });
        });

        elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                currentFilter = btn.dataset.filter;
                updateFilterButtons();
                renderTodos();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && editingId) {
                cancelEdit();
            }
        });
    }

    function addTodo() {
        const text = elements.input.value.trim();
        if (text) {
            vscode.postMessage({ 
                command: 'addTodo', 
                text: text 
            });
            elements.input.value = '';
            elements.input.focus();
        }
    }

    function toggleTodo(id) {
        vscode.postMessage({ 
            command: 'toggleTodo', 
            id: id 
        });
    }

    function deleteTodo(id) {
        vscode.postMessage({ 
            command: 'deleteTodo', 
            id: id 
        });
    }

    function startEdit(id, currentText) {
        if (editingId) {
            cancelEdit();
        }
        
        editingId = id;
        const todoItem = document.querySelector(`[data-id="${id}"]`);
        const textElement = todoItem.querySelector('.todo-text');
        
        textElement.contentEditable = true;
        textElement.classList.add('editing');
        textElement.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(textElement);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        
        textElement.addEventListener('blur', () => saveEdit(id), { once: true });
        textElement.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveEdit(id);
            }
        }, { once: true });
    }

    function saveEdit(id) {
        const todoItem = document.querySelector(`[data-id="${id}"]`);
        const textElement = todoItem.querySelector('.todo-text');
        const newText = textElement.textContent.trim();
        
        if (newText && newText !== todos.find(t => t.id === id).text) {
            vscode.postMessage({ 
                command: 'updateTodo', 
                id: id,
                text: newText
            });
        }
        
        cancelEdit();
    }

    function cancelEdit() {
        if (editingId) {
            const todoItem = document.querySelector(`[data-id="${editingId}"]`);
            if (todoItem) {
                const textElement = todoItem.querySelector('.todo-text');
                textElement.contentEditable = false;
                textElement.classList.remove('editing');
                const originalTodo = todos.find(t => t.id === editingId);
                if (originalTodo) {
                    textElement.textContent = originalTodo.text;
                }
            }
            editingId = null;
        }
    }

    function renderTodos() {
        const filteredTodos = filterTodos();
        
        if (filteredTodos.length === 0) {
            elements.todoList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-text">
                        ${currentFilter === 'all' ? 'No todos yet. Add one above!' : 
                          currentFilter === 'active' ? 'No active todos' : 
                          'No completed todos'}
                    </div>
                </div>
            `;
            return;
        }

        elements.todoList.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <input type="checkbox" 
                       class="todo-checkbox" 
                       ${todo.completed ? 'checked' : ''}
                       onclick="toggleTodo('${todo.id}')">
                <span class="todo-text" 
                      ondblclick="startEdit('${todo.id}', '${escapeHtml(todo.text)}')"
                      title="Created: ${new Date(todo.createdAt).toLocaleString()}">
                    ${escapeHtml(todo.text)}
                </span>
                <button class="todo-delete" onclick="deleteTodo('${todo.id}')">🗑️</button>
            </div>
        `).join('');
    }

    function filterTodos() {
        switch (currentFilter) {
            case 'active':
                return todos.filter(t => !t.completed);
            case 'completed':
                return todos.filter(t => t.completed);
            default:
                return todos;
        }
    }

    function updateStats(stats) {
        const percentage = stats.total > 0 ? 
            Math.round((stats.completed / stats.total) * 100) : 0;
        
        elements.statsText.textContent = 
            `${stats.pending} active, ${stats.completed} completed (${percentage}%)`;
        elements.progressFill.style.width = `${percentage}%`;
        
        if (percentage === 100 && stats.total > 0) {
            celebrate();
        }
    }

    function celebrate() {
        elements.progressFill.style.backgroundColor = 'var(--vscode-terminal-ansiGreen)';
        setTimeout(() => {
            elements.progressFill.style.backgroundColor = '';
        }, 2000);
    }

    function updateFilterButtons() {
        elements.filterButtons.forEach(btn => {
            if (btn.dataset.filter === currentFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function requestRefresh() {
        vscode.postMessage({ command: 'requestRefresh' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    window.toggleTodo = toggleTodo;
    window.deleteTodo = deleteTodo;
    window.startEdit = startEdit;

    window.addEventListener('message', event => {
        const message = event.data;
        switch (message.command) {
            case 'updateTodos':
                todos = message.todos;
                renderTodos();
                updateStats(message.stats);
                break;
        }
    });

    init();
})();