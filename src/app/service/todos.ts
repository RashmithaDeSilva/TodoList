import { Injectable } from '@angular/core';
import { Todo } from '../models/todo.type';

@Injectable({
  providedIn: 'root'
})
export class Todos {
  private db: IDBDatabase | null = null;
  private dbReady!: Promise<void>;
  private resolveReady!: () => void;

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
  async addTodo(todo: Omit<Todo, 'id'>): Promise<void> {
    await this.waitForDB();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not ready');

      const tx = this.db.transaction('todos', 'readwrite');
      const store = tx.objectStore('todos');

      const newTodo = {
        ...todo,
        createdDate: new Date().toISOString(), // Set system time
        dueDate: todo.dueDate.toISOString()
      };

      store.add(newTodo);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Get todos
  async getTodos(): Promise<Todo[]> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('todos', 'readonly');
      const store = tx.objectStore('todos');
      const request = store.getAll();

      request.onsuccess = () => {
        const todos = (request.result as any[]).map((item): Todo => ({
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
  async updateTodo(todo: Todo): Promise<void> {
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
  
}
