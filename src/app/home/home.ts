import { Component, OnInit, signal, computed, ViewChild, Signal } from '@angular/core';
import { TodoService } from '../service/todos';
import { TodoModel } from '../models/todo.type';
import { TodoComponent } from '../components/todo/todo';
import { Filters } from '../utils/enums/filters';

@Component({
  selector: 'app-home',
  imports: [TodoComponent],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  // This will call child component
  @ViewChild(TodoComponent) child!: TodoComponent;
  protected todoCount = signal<Number>(0);
  protected isEditModeFromChild: Signal<boolean> = signal(false);
  protected Filters = Filters;
  protected filter: Filters = Filters.ALL;
  protected searchText = signal<string>('');


  constructor(private todoService: TodoService) {}

  async ngOnInit() {
    await this.loadTodoCount();
    this.isEditModeFromChild = computed(() => this.child?.isEditMode?.() ?? false);
  }

  private async loadTodoCount() {
    const count = await this.todoService.getTodoCount(this.filter);
    this.todoCount.set(count);
  }

  protected async addTodo() {
    const newTodo: Omit<TodoModel, 'id'> = {
      title: 'New Task',
      body: 'This is a task detail',
      completed: false,
      createdDate: new Date(),
      dueDate: new Date(Date.now() + 86400000),
    };

    await this.todoService.addTodo(newTodo);
    await this.loadTodoCount();
  }

  // This function trigger when child component send notify
  protected async onChildNotify() {
    await this.loadTodoCount();
  }
  
  protected async handleAddTodo(child: TodoComponent) {
    if (this.child.isTodoExsist()) {
      await this.addTodo();
      const newest = await this.todoService.getNewestTodo();

      if (newest) {
        const data = await this.todoService.getTodos(1, 10, this.filter, this.searchText())

        if (this.filter === Filters.ALL || this.filter === Filters.OPEN) {
          data.todos.pop()
        }
        data.todos.unshift(newest);

        child.todos.set(data.todos);
        child.editTodo(newest);
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  protected async onFilterChange(value: any) {
    value = (value.target as HTMLSelectElement).value
    this.filter = value as Filters;
    this.child.filter = value as Filters;
    await this.loadTodoCount();
    this.child.page.set(1);
    await this.child.loadTodos();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected getTitle(): string {
    switch (this.filter) {
      case Filters.DONE: return 'Done Todos';
      case Filters.OPEN: return 'Open Todos';
      case Filters.EXPIRED: return 'Expired Todos';
      default: return 'All Todos';
    }
  }

  protected async search(value: string) {
    this.searchText.set(value);
    this.child.searchText.set(value);
    this.child.page.set(1);
    await this.child.loadTodos();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

}
