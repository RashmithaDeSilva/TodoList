import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import { TodoModel } from '../../models/todo.type';
import { TodoService } from '../../service/todos';
import { NgClass } from '@angular/common';
import { Filters } from '../../utils/enums/filters';

@Component({
  selector: 'app-todo',
  imports: [NgClass],
  templateUrl: './todo.html'
})
export class TodoComponent implements OnInit {
  // This snd notification to perent
  @Output() notify = new EventEmitter<void>();
  todos = signal<TodoModel[]>([]);
  isTodoExsist = signal<boolean>(false);
  protected editTodoData = signal<TodoModel | null>(null);
  protected errorMessage = signal<string | null>(null);
  protected countdownMap = new Map<number, string>();
  private intervalId = signal<number>(-1);
  protected isDeleteId = signal<number>(-1);
  isEditMode = signal<boolean>(false);
  filter: Filters = Filters.ALL;
  searchText = signal<string>('');
  protected skelitenSize = signal<Array<number>>([1,2,3]);
  page = signal<number>(1);
  protected showDirectionBtns = signal<boolean>(false);
  protected nextBtn = signal<boolean>(false);
  protected previousBtn = signal<boolean>(false);


  constructor(private todoService: TodoService) {}

  async ngOnInit() {
    // Load todos
    const interval = setInterval(async () => {
        await this.loadTodos();
        this.isTodoExsist.set(true);
        clearInterval(interval);
    }, 1500); // 1.5 seconds

    // Set live time timer
    this.updateCountdowns();
    this.intervalId.set(setInterval(() => {
      this.updateCountdowns();
    }, 60_000)); // every minute
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId());
    }
  }

  async loadTodos() {
    const data = await this.todoService.getTodos(this.page(), 10, this.filter, this.searchText());
    this.todos.set(data.todos);
    this.showDirectionBtns.set(this.page() === 1 && data.next || this.page() !== 1 && data.privias);
    this.nextBtn.set(data.next);
    this.previousBtn.set(data.privias);
    this.updateCountdowns();
  }

  protected async deleteTodo(id: number) {
    await this.todoService.deleteTodo(id);
    if (this.todos().length === 1) {
      this.page.set((this.page() - 1) > 0 ? this.page() - 1 : 1);
    }
    await this.loadTodos();
    this.notify.emit(); // Send notification to parent
  }

  editTodo(todo: TodoModel) {
    this.editTodoData.set({ ...todo });
    this.errorMessage.set(null);
  }

  protected async cancelEdit() {
    this.editTodoData.set(null);
    await this.loadTodos();
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
    this.notify.emit(); // Send notification to parent
  }

  protected getEditDueDateValue(): string {
    const date = this.editTodoData()?.dueDate ?? new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`; // "yyyy-MM-ddTHH:mm"
  }

  protected async next() {
    this.page.set(this.page() + 1)
    await this.loadTodos();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected async previous() {
    this.page.set(this.page() - 1)
    await this.loadTodos();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
