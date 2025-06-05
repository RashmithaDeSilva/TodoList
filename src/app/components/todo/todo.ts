import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { TodoModel } from '../../models/todo.type';
import { TodoService } from '../../service/todos';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-todo',
  imports: [NgClass],
  templateUrl: './todo.html'
})
export class TodoComponent implements OnInit {
  // This snd notification to perent
  @Output() notify = new EventEmitter<void>();
  protected todos = signal<TodoModel[]>([]);
  protected isTodoExsist = signal<boolean>(false);
  protected editTodoData = signal<TodoModel | null>(null);
  protected errorMessage = signal<string | null>(null);
  protected countdownMap = new Map<number, string>();
  private intervalId: number = 0;

  constructor(private todoService: TodoService) {}

  async ngOnInit() {
    // Load todos
    await this.loadTodos();
    this.isTodoExsist.set(true);

    // Set live time timer
    this.updateCountdowns();
    this.intervalId = setInterval(() => {
      this.updateCountdowns();
    }, 60_000); // every minute
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async loadTodos() {
    const data = await this.todoService.getTodos();
    this.todos.set(data);
    this.updateCountdowns();
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
    event.preventDefault();

    if (!title || !dueDateStr) {
      this.errorMessage.set('Title and Due Date are required.');
      return;
    }

    const dueDate = new Date(dueDateStr);
    const now = new Date();

    if (dueDate.getTime() < now.getTime()) {
      this.errorMessage.set('Due date and time cannot be in the past.');
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
    return `${ d.getDate().toString().padStart(2, '0') }/${ (d.getMonth() + 1).toString().padStart(2, '0') }/${ d.getFullYear() }`;
  }

  protected updateCountdowns() {
    this.countdownMap.clear();
    for (const todo of this.todos()) {
      if (!todo.completed) {
        this.countdownMap.set(todo.id, this.calculateCountdown(todo.dueDate));
      }
    }
  }

  private calculateCountdown(dueDate: Date): string {
    const now = new Date();
    const diff = new Date(dueDate).getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    return `${days}d ${hours}h ${minutes}m`;
  }

  protected async completedCheckbox(id: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    await this.todoService.checkTodo(id, isChecked);
    await this.loadTodos();
  }

  protected getEditDueDateValue(): string {
    const date = this.editTodoData()?.dueDate ?? new Date();
    
    // Default time to 00:00 if only date part was stored
    const iso = new Date(date).toISOString(); // Full ISO with Z
    return iso.slice(0, 16); // "yyyy-MM-ddTHH:mm"
  }

  
}
