import { Component, OnInit, signal, computed, ViewChild, Signal } from '@angular/core';
import { TodoService } from '../service/todos';
import { TodoModel } from '../models/todo.type';
import { TodoComponent } from '../components/todo/todo';

@Component({
  selector: 'app-home',
  imports: [TodoComponent],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  // This will call child component
  @ViewChild(TodoComponent) child!: TodoComponent;
  protected todoCount = signal<Number>(0);
  protected isEditModeFromChild: Signal<boolean> = signal(false);;


  constructor(private todoService: TodoService) {}

  async ngOnInit() {
    await this.loadTodoCount();
    this.isEditModeFromChild = computed(() => this.child?.isEditMode?.() ?? false);
  }

  private async loadTodoCount() {
    const count = await this.todoService.getTodoCount();
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
    // await this.child.loadTodos();
  }

  // This function trigger when child component send notify
  protected async onChildNotify() {
    await this.loadTodoCount();
  }
  
  protected async handleAddTodo(child: TodoComponent) {
    await this.addTodo();
    const newest = await this.todoService.getNewestTodo();

    if (newest) {
      let todos = await this.todoService.getTodos();
      todos.pop()
      todos.unshift(newest);

      child.todos.set(todos);
      child.editTodo(newest);
    }
  }


}
