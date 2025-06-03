import { Component, OnInit, signal, computed } from '@angular/core';
import { TodoService } from '../service/todos';
import { TodoModel } from '../models/todo.type';
import { TodoComponent } from '../components/todo/todo';

@Component({
  selector: 'app-home',
  imports: [TodoComponent],
  templateUrl: './home.html',
})
export class Home implements OnInit {
  todoCount = signal<Number>(0);

  isCheange = computed<Promise<number>>(async () => await this.todoService.getTodoCount());

  constructor(private todoService: TodoService) {}

  async ngOnInit() {
    await this.loadTodoCount();
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
  }
  
}
