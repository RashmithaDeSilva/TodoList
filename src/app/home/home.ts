import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Todos } from '../service/todos';
import { Todo } from '../models/todo.type';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  todos = signal<Todo[]>([]);
  todoCount = computed<number>(() => this.todos().length);

  constructor(private todoService: Todos) {
  }

  async ngOnInit() {
    await this.loadTodos();
  }

  async loadTodos() {
    const data = await this.todoService.getTodos();
    this.todos.set(data);
  }

  async addTodo() {
    const newTodo: Omit<Todo, 'id'> = {
      title: 'New Task',
      body: 'This is a test',
      completed: false,
      createdDate: new Date(),
      dueDate: new Date(Date.now() + 86400000) // 1 day later
    };

    await this.todoService.addTodo(newTodo);
    this.loadTodos();
  }

  async deleteTodo(id: number) {
    await this.todoService.deleteTodo(id);
    this.loadTodos();
  }

  async toggleComplete(todo: Todo) {
    todo.completed = !todo.completed;
    await this.todoService.updateTodo(todo);
    this.loadTodos();
  }

}
