import { computed, Injectable } from '@angular/core';
import { TodoModel } from '../models/todo.type';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private db: IDBDatabase | null = null;
  private dbReady!: Promise<void>;
  private resolveReady!: () => void;
  todoCount: number = 0;

  constructor() { 
    this.dbReady = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    this.openDB();
  }

  // Init DB
  openDB() {
    const request = indexedDB.open('TodoDB', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('todos')) {
        const store = db.createObjectStore('todos', {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex('dueDate', 'dueDate', { unique: false});
      }
    }

    request.onsuccess = () => {
      this.db = request.result;
      this.resolveReady();
    }

    request.onerror = () => {
      console.error('IndexedDB failed: ', request.error);
    }
  }

  // Wait
  private async waitForDB() {
    await this.dbReady;
    if (!this.db) throw new Error('DB not ready');
    return this.db;
  }

  // Add todo
  async addTodo(todo: Omit<TodoModel, 'id'>): Promise<void> {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not ready');

      const tx = this.db.transaction('todos', 'readwrite');
      const store = tx.objectStore('todos');
      store.add(todo);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get todos
  async getTodos(): Promise<TodoModel[]> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('todos', 'readonly');
      const store = tx.objectStore('todos');
      const request = store.getAll();

      request.onsuccess = () => {
        const todos = (request.result as any[]).map((item): TodoModel => ({
          ...item,
          createdDate: new Date(item.createdDate),
          dueDate: new Date(item.dueDate)
        }));
        resolve(todos);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Update todo
  async updateTodo(todo: TodoModel): Promise<void> {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not ready');

      const tx = this.db.transaction('todos', 'readwrite');
      const store = tx.objectStore('todos');

      store.put({
        ...todo,
        createdDate: todo.createdDate.toISOString(),
        dueDate: todo.dueDate.toISOString()
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Delete todo
  async deleteTodo(id: number): Promise<void> {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not ready');

      const tx = this.db.transaction('todos', 'readwrite');
      const store = tx.objectStore('todos');
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get todo count
  async getTodoCount(): Promise<number> {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not ready');

      const tx = this.db.transaction('todos', 'readonly');
      const store = tx.objectStore('todos');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Check todo
  async checkTodo(todoId: number, value: boolean): Promise<void> {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not ready');

      const tx = this.db.transaction('todos', 'readwrite');
      const store = tx.objectStore('todos');
      const getRequest = store.get(todoId);

      getRequest.onsuccess = () => {
        const todo = getRequest.result;
        if (!todo) {
          return reject(`Todo with ID ${ todoId } not found`);
        }

        todo.completed = value;
        store.put(todo);
      };
      
      getRequest.onerror = () => reject(getRequest.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  
}
