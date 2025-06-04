import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { TodoModel } from '../../models/todo.type';
import { TodoService } from '../../service/todos';

@Component({
  selector: 'app-todo',
  imports: [],
  templateUrl: './todo.html'
})
export class TodoComponent implements OnInit {
  // This snd notification to perent
  @Output() notify = new EventEmitter<void>();
  protected todos = signal<TodoModel[]>([]);
  protected isTodoExsist = signal<boolean>(false);
  protected editTodoData = signal<TodoModel | null>(null);
  protected errorMessage = signal<string | null>(null);

  constructor(private todoService: TodoService) {}

  async ngOnInit() {
    await this.loadTodos();
    this.isTodoExsist.set(true);
  }

  async loadTodos() {
    const data = await this.todoService.getTodos();
    this.todos.set(data);
  }

  protected async deleteTodo(id: number) {
    await this.todoService.deleteTodo(id);
    await this.loadTodos();
    this.notify.emit(); // Send notification to parent
  }

  protected editTodo(todo: TodoModel) {
    this.editTodoData.set({ ...todo });
    this.errorMessage.set(null);
  }

  protected cancelEdit() {
    this.editTodoData.set(null);
  }

  protected async saveEdit(event: Event, title: string, body: string, dueDateStr: string) {
    event.preventDefault(); // Prevents page reload

    if (!title || !dueDateStr) {
      this.errorMessage.set('Title and Due Date are required.');
      return;
    }

    const dueDate = new Date(dueDateStr);
    if (dueDate < new Date()) {
      this.errorMessage.set('Due date cannot be in the past.');
      return;
    }

    const todo = this.editTodoData();
    if (!todo) return;

    const updated: TodoModel = {
      ...todo,
      title,
      body,
      dueDate,
    };

    await this.todoService.updateTodo(updated);
    this.editTodoData.set(null);
    this.errorMessage.set(null);
    await this.loadTodos();
  }

  protected formatDate(date: Date): string {
    const d = new Date(date);
    return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
  }

  protected calculateCountdown(dueDate: Date): string {
    const now = new Date();
    const diff = new Date(dueDate).getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    return `${days}d ${hours}h ${minutes}m`;
  }
  
}
