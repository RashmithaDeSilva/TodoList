import { Component, OnInit, signal, computed } from '@angular/core';
import { Todos } from '../service/todos';
import { Todo } from '../models/todo.type';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
})
export class Home implements OnInit {
  todos = signal<Todo[]>([]);
  todoCount = computed(() => this.todos().length);
  editTodoData = signal<Todo | null>(null);
  errorMessage = signal<string | null>(null);

  constructor(private todoService: Todos) {}

  async ngOnInit() {
    await this.loadTodos();
  }

  private async loadTodos() {
    const data = await this.todoService.getTodos();
    this.todos.set(data);
  }

  protected async addTodo() {
    const newTodo: Omit<Todo, 'id'> = {
      title: 'New Task',
      body: 'This is a task detail',
      completed: false,
      createdDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    };

    await this.todoService.addTodo(newTodo);
    await this.loadTodos();
  }

  protected async deleteTodo(id: number) {
    await this.todoService.deleteTodo(id);
    await this.loadTodos();
  }

  protected editTodo(todo: Todo) {
    this.editTodoData.set({ ...todo });
    this.errorMessage.set(null);
  }

  protected cancelEdit() {
    this.editTodoData.set(null);
  }

  async saveEdit(event: Event, title: string, body: string, dueDateStr: string) {
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

    const updated: Todo = {
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
