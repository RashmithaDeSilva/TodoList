import { TestBed } from '@angular/core/testing';
import { Filters } from '../utils/enums/filters';
import { TodoModel } from '../models/todo.type';
import { TodoService } from './todos';

describe('TodoService', () => {
  let service: TodoService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TodoService);
    // Ensure DB is ready before each test
    await service['waitForDB']();
    // Clear all todos before each test to ensure a clean slate
    const db = await service['waitForDB']();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('todos', 'readwrite');
      const store = tx.objectStore('todos');
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('addTodo', () => {
    it('should add a new todo to the database', async () => {
      const newTodo: Omit<TodoModel, 'id'> = {
        title: 'Test Todo',
        description: 'Test Description',
        dueDate: new Date(),
        createdDate: new Date(),
        completed: false,
      };
      await service.addTodo(newTodo);
      const addedTodo = await service.getNewestTodo();
      expect(addedTodo).toBeDefined();
      expect(addedTodo?.title).toBe(newTodo.title);
      expect(addedTodo?.completed).toBe(false);
    });

    it('should increase the todo count after adding a todo', async () => {
      const initialCount = await service.getTodoCount(Filters.ALL);
      expect(initialCount).toBe(0); // Should be 0 after clearing

      const newTodo: Omit<TodoModel, 'id'> = {
        title: 'Test Todo 2',
        description: 'Another Test Description',
        dueDate: new Date(),
        createdDate: new Date(),
        completed: false,
      };
      await service.addTodo(newTodo);
      const newCount = await service.getTodoCount(Filters.ALL);
      expect(newCount).toBe(1);
    });
  });

  describe('deleteTodo', () => {
    it('should delete a todo from the database', async () => {
      const newTodo: Omit<TodoModel, 'id'> = {
        title: 'Todo to delete',
        description: 'This todo will be deleted',
        dueDate: new Date(),
        createdDate: new Date(),
        completed: false,
      };
      await service.addTodo(newTodo);
      const addedTodo = await service.getNewestTodo();
      expect(addedTodo).toBeDefined();

      if (addedTodo && typeof addedTodo.id === 'number') { // Type guard for id
        await service.deleteTodo(addedTodo.id);
        const deletedTodo = await service.getNewestTodo(); // Or a specific getById if available
        // If this was the only todo, newest might be undefined or a different one
        // A more robust check would be to try to fetch by addedTodo.id
        const count = await service.getTodoCount(Filters.ALL);
        expect(count).toBe(0);
      } else {
        fail('Added todo ID is undefined, cannot proceed with delete test');
      }
    });

    it('should decrease the todo count after deleting a todo', async () => {
      const todo1: Omit<TodoModel, 'id'> = { title: 'Todo 1', description: '', dueDate: new Date(), createdDate: new Date(), completed: false };
      const todo2: Omit<TodoModel, 'id'> = { title: 'Todo 2', description: '', dueDate: new Date(), createdDate: new Date(), completed: false };
      await service.addTodo(todo1);
      await service.addTodo(todo2);

      let count = await service.getTodoCount(Filters.ALL);
      expect(count).toBe(2);

      const newestTodo = await service.getNewestTodo();
      expect(newestTodo).toBeDefined();

      if (newestTodo && typeof newestTodo.id === 'number') {
        await service.deleteTodo(newestTodo.id);
        count = await service.getTodoCount(Filters.ALL);
        expect(count).toBe(1);
      } else {
        fail('Newest todo ID is undefined, cannot proceed with delete count test');
      }
    });

    it('should handle deleting a non-existent todo gracefully', async () => {
      const initialCount = await service.getTodoCount(Filters.ALL);
      expect(initialCount).toBe(0);

      await service.deleteTodo(999); // Assuming 999 is a non-existent ID

      const countAfterDelete = await service.getTodoCount(Filters.ALL);
      expect(countAfterDelete).toBe(0);
      // No error should be thrown, or if it does, the test should expect it.
      // Based on current service, no error is thrown for non-existent delete.
    });
  });

  describe('checkTodo', () => {
    it('should toggle a todo completion status', async () => {
      const newTodoData: Omit<TodoModel, 'id'> = {
        title: 'Todo to toggle',
        description: 'This todo will be toggled',
        dueDate: new Date(),
        createdDate: new Date(),
        completed: false,
      };
      await service.addTodo(newTodoData);
      let addedTodo = await service.getNewestTodo();
      expect(addedTodo).toBeDefined();
      expect(addedTodo?.completed).toBe(false);

      if (addedTodo && typeof addedTodo.id === 'number') {
        // Mark as completed
        await service.checkTodo(addedTodo.id, true);
        // Fetch the todo again to check updated status
        // Note: getNewestTodo might not be reliable if other todos are added.
        // A direct getById would be better if it existed.
        // For now, assuming it's the only todo or newest.
        // Let's refine this by using getTodos and finding by ID.
        let todos = await service.getTodos(1, 1, Filters.ALL, addedTodo.title);
        let updatedTodo = todos.todos.find(t => t.id === addedTodo!.id);
        expect(updatedTodo?.completed).toBe(true);

        // Mark as not completed
        await service.checkTodo(addedTodo.id, false);
        todos = await service.getTodos(1, 1, Filters.ALL, addedTodo.title);
        updatedTodo = todos.todos.find(t => t.id === addedTodo!.id);
        expect(updatedTodo?.completed).toBe(false);
      } else {
        fail('Added todo ID is undefined, cannot proceed with toggle test');
      }
    });

    it('should reject when trying to toggle a non-existent todo', async () => {
      try {
        await service.checkTodo(999, true); // Non-existent ID
        fail('checkTodo should have rejected for a non-existent todo');
      } catch (error) {
        expect(error).toBeTruthy();
        // Check for a specific error message if the service provides one
        expect(error).toBe('Todo with ID 999 not found');
      }
    });
  });

  describe('clearCompletedTodos (simulated)', () => {
    it('should delete all completed todos and keep non-completed ones', async () => {
      const todo1: Omit<TodoModel, 'id'> = { title: 'Completed Todo 1', description: '', dueDate: new Date(), createdDate: new Date(), completed: false };
      const todo2: Omit<TodoModel, 'id'> = { title: 'Active Todo 1', description: '', dueDate: new Date(), createdDate: new Date(), completed: false };
      const todo3: Omit<TodoModel, 'id'> = { title: 'Completed Todo 2', description: '', dueDate: new Date(), createdDate: new Date(), completed: false };

      await service.addTodo(todo1); // Becomes c1
      await service.addTodo(todo2); // Becomes a1
      await service.addTodo(todo3); // Becomes c2

      const todosInitial = await service.getTodos(1, 10, Filters.ALL, '');
      const c1 = todosInitial.todos.find(t => t.title === 'Completed Todo 1');
      const a1 = todosInitial.todos.find(t => t.title === 'Active Todo 1');
      const c2 = todosInitial.todos.find(t => t.title === 'Completed Todo 2');

      expect(c1).toBeDefined();
      expect(a1).toBeDefined();
      expect(c2).toBeDefined();

      if (!c1 || !c1.id || !a1 || !a1.id || !c2 || !c2.id) {
        fail('Todo IDs not found after adding');
        return;
      }

      // Mark c1 and c2 as completed
      await service.checkTodo(c1.id, true);
      await service.checkTodo(c2.id, true);

      // Simulate clear completed:
      // 1. Get all completed todos
      const completedTodosResult = await service.getTodos(1, 10, Filters.DONE, '');
      expect(completedTodosResult.todos.length).toBe(2); // c1 and c2

      // 2. Delete them
      for (const todo of completedTodosResult.todos) {
        if (todo.id) {
          await service.deleteTodo(todo.id);
        }
      }

      // Verify results
      const remainingTodosResult = await service.getTodos(1, 10, Filters.ALL, '');
      expect(remainingTodosResult.todos.length).toBe(1);
      expect(remainingTodosResult.todos[0].title).toBe('Active Todo 1');
      expect(remainingTodosResult.todos[0].completed).toBe(false);

      const completedCount = await service.getTodoCount(Filters.DONE);
      expect(completedCount).toBe(0);

      const activeCount = await service.getTodoCount(Filters.OPEN); // Or Filters.ALL if it's the only one
      expect(activeCount).toBe(1);
    });
  });

  describe('getTodos', () => {
    const baseTodo: Omit<TodoModel, 'id' | 'title' | 'completed' | 'dueDate'> = {
      description: 'Test todo',
      createdDate: new Date(),
    };

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    const todosToLoad: Omit<TodoModel, 'id'>[] = [
      { ...baseTodo, title: 'Active Alpha 1', completed: false, dueDate: tomorrow }, // Open
      { ...baseTodo, title: 'Completed Alpha 2', completed: true, dueDate: tomorrow }, // Done
      { ...baseTodo, title: 'Active Bravo 3', completed: false, dueDate: tomorrow }, // Open
      { ...baseTodo, title: 'Expired Charlie 4', completed: false, dueDate: yesterday }, // Expired
      { ...baseTodo, title: 'Completed Bravo 5', completed: true, dueDate: yesterday }, // Done
      { ...baseTodo, title: 'Active Alpha 6 (Past Due)', completed: false, dueDate: yesterday }, // Expired (also matches 'Active' in title)
      { ...baseTodo, title: 'Future Task 7', completed: false, dueDate: new Date(now.setDate(now.getDate() + 5))}, // Open
    ];

    beforeEach(async () => {
      // Clear before each 'getTodos' specific test too, then load sample data
      const db = await service['waitForDB']();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('todos', 'readwrite');
        const store = tx.objectStore('todos');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });
      for (const todo of todosToLoad) {
        await service.addTodo(todo);
      }
    });

    it('should return all todos when no filter is applied (ALL)', async () => {
      const result = await service.getTodos(1, 10, Filters.ALL, '');
      expect(result.todos.length).toBe(todosToLoad.length);
      expect(result.total).toBe(todosToLoad.length);
    });

    it('should return only OPEN todos', async () => {
      const result = await service.getTodos(1, 10, Filters.OPEN, '');
      // Expected: Active Alpha 1, Active Bravo 3, Future Task 7
      expect(result.todos.length).toBe(3);
      expect(result.total).toBe(3);
      result.todos.forEach(todo => {
        expect(todo.completed).toBe(false);
        // Due date must be in the future for OPEN state in the service logic
        expect(todo.dueDate > new Date()).toBe(true);
      });
    });

    it('should return only DONE todos', async () => {
      const result = await service.getTodos(1, 10, Filters.DONE, '');
      // Expected: Completed Alpha 2, Completed Bravo 5
      expect(result.todos.length).toBe(2);
      expect(result.total).toBe(2);
      result.todos.forEach(todo => expect(todo.completed).toBe(true));
    });

    it('should return only EXPIRED todos', async () => {
      const result = await service.getTodos(1, 10, Filters.EXPIRED, '');
      // Expected: Expired Charlie 4, Active Alpha 6 (Past Due)
      expect(result.todos.length).toBe(2);
      expect(result.total).toBe(2);
      result.todos.forEach(todo => {
        expect(todo.completed).toBe(false);
        expect(todo.dueDate <= new Date()).toBe(true);
      });
    });

    it('should handle pagination correctly', async () => {
      // Total 7 todos. Page size 3.
      // Page 1
      let page = await service.getTodos(1, 3, Filters.ALL, '');
      expect(page.todos.length).toBe(3);
      expect(page.total).toBe(7);
      expect(page.privias).toBe(false);
      expect(page.next).toBe(true);

      // Page 2
      page = await service.getTodos(2, 3, Filters.ALL, '');
      expect(page.todos.length).toBe(3);
      expect(page.total).toBe(7);
      expect(page.privias).toBe(true);
      expect(page.next).toBe(true);

      // Page 3
      page = await service.getTodos(3, 3, Filters.ALL, '');
      expect(page.todos.length).toBe(1); // Remaining 1
      expect(page.total).toBe(7);
      expect(page.privias).toBe(true);
      expect(page.next).toBe(false);
    });

    it('should filter by search text (case-insensitive)', async () => {
      const result = await service.getTodos(1, 10, Filters.ALL, 'alpha');
      // Expected: Active Alpha 1, Completed Alpha 2, Active Alpha 6 (Past Due)
      expect(result.todos.length).toBe(3);
      expect(result.total).toBe(3);
      result.todos.forEach(todo => expect(todo.title.toLowerCase()).toContain('alpha'));
    });

    it('should filter by search text AND other filters (e.g., OPEN)', async () => {
      const result = await service.getTodos(1, 10, Filters.OPEN, 'active');
      // OPEN todos: Active Alpha 1, Active Bravo 3, Future Task 7
      // Filtered by 'active': Active Alpha 1, Active Bravo 3
      expect(result.todos.length).toBe(2);
      expect(result.total).toBe(2);
      result.todos.forEach(todo => {
        expect(todo.title.toLowerCase()).toContain('active');
        expect(todo.completed).toBe(false);
        expect(todo.dueDate > new Date()).toBe(true);
      });
    });

    it('should return empty results when search text matches nothing', async () => {
      const result = await service.getTodos(1, 10, Filters.ALL, 'NonExistentSearchTerm');
      expect(result.todos.length).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should return empty results and correct flags when no todos are in the DB', async () => {
      // Clear all todos loaded by beforeEach for this specific test
      const db = await service['waitForDB']();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('todos', 'readwrite');
        const store = tx.objectStore('todos');
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => reject(clearRequest.error);
      });

      const result = await service.getTodos(1, 10, Filters.ALL, '');
      expect(result.todos.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.next).toBe(false);
      expect(result.privias).toBe(false);
    });
  });
});
