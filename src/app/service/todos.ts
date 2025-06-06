import { computed, Injectable } from '@angular/core';
import { TodoModel } from '../models/todo.type';
import { Filters } from '../utils/enums/filters';

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
  async getTodos(page: number, size: number, filter: Filters, searchText: string): Promise<{
    todos: TodoModel[]; total: number; next: boolean; privias: boolean; }> {

    const db = await this.waitForDB();
    const offset = (page - 1) * size;
    const todos: TodoModel[] = [];

    return new Promise((resolve, reject) => {
      const tx = db.transaction('todos', 'readonly');
      const store = tx.objectStore('todos');
      const request = store.openCursor();

      let matchedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) {
          // Finished scanning, resolve with results
          resolve({
            todos,
            total: matchedCount,
            next: matchedCount > offset + size,
            privias: page > 1 && offset < matchedCount,
          });
          return;
        }

        const raw = cursor.value;
        const todo: TodoModel = {
          ...raw,
          createdDate: new Date(raw.createdDate),
          dueDate: new Date(raw.dueDate)
        };

        const now = new Date();
        let matchesFilter = true;

        switch (filter) {
          case Filters.OPEN:
            matchesFilter = !todo.completed && todo.dueDate > now;
            break;
          case Filters.EXPIRED:
            matchesFilter = !todo.completed && todo.dueDate <= now;
            break;
          case Filters.DONE:
            matchesFilter = todo.completed;
            break;
          case Filters.ALL:
          default:
            matchesFilter = true;
        }

        const matchesSearch = searchText.trim() === '' ||
          todo.title.toLowerCase().includes(searchText.toLowerCase());

        if (matchesFilter && matchesSearch) {
          if (matchedCount >= offset && todos.length < size) {
            todos.push(todo);
          }
          matchedCount++;
        }

        cursor.continue();
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
  // async getTodoCount(): Promise<number> {
  //   await this.waitForDB();
  //   return new Promise((resolve, reject) => {
  //     if (!this.db) return reject('DB not ready');

  //     const tx = this.db.transaction('todos', 'readonly');
  //     const store = tx.objectStore('todos');
  //     const request = store.count();

  //     request.onsuccess = () => resolve(request.result);
  //     request.onerror = () => reject(request.error);
  //   });
  // }

  // Get todo count
  async getTodoCount(filter: Filters): Promise<number> {
    const db = await this.waitForDB();

    return new Promise((resolve, reject) => {
      if (!db) return reject('DB not ready');

      const tx = db.transaction('todos', 'readonly');
      const store = tx.objectStore('todos');
      const request = store.openCursor();

      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) {
          return resolve(count); // No more records
        }

        const todo = cursor.value as TodoModel;
        todo.dueDate = new Date(todo.dueDate);

        const now = new Date();
        let matchesFilter = true;

        switch (filter) {
          case Filters.OPEN:
            matchesFilter = !todo.completed && todo.dueDate > now;
            break;
          case Filters.EXPIRED:
            matchesFilter = !todo.completed && todo.dueDate <= now;
            break;
          case Filters.DONE:
            matchesFilter = todo.completed;
            break;
          case Filters.ALL:
          default:
            matchesFilter = true;
        }

        if (matchesFilter) {
          count++;
        }

        cursor.continue();
      };

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

  // Get newest todo
  async getNewestTodo(): Promise<TodoModel | undefined> {
    const db = await this.waitForDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('todos', 'readonly');
      const store = tx.objectStore('todos');
      const request = store.openCursor(null, 'prev'); // 'prev' = descending order by key (id)

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor?.value as TodoModel);
      };

      request.onerror = () => reject(request.error);
    });
  }

}
