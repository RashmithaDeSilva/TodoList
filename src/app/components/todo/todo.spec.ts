import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TodoComponent } from './todo';
import { TodoService } from '../../service/todos';
import { TodoModel } from '../../models/todo.type';
import { Filters } from '../../utils/enums/filters';
import { of } from 'rxjs'; // For mocking service methods that might return Observables, though current service uses Promises
import { signal } from '@angular/core';

// Mock TodoService
class MockTodoService {
  getTodos = jasmine.createSpy('getTodos').and.returnValue(Promise.resolve({ todos: [], total: 0, next: false, privias: false }));
  addTodo = jasmine.createSpy('addTodo').and.returnValue(Promise.resolve());
  deleteTodo = jasmine.createSpy('deleteTodo').and.returnValue(Promise.resolve());
  checkTodo = jasmine.createSpy('checkTodo').and.returnValue(Promise.resolve());
  updateTodo = jasmine.createSpy('updateTodo').and.returnValue(Promise.resolve());
  // Add any other methods used by the component, e.g., getTodoCount if needed indirectly
}

describe('TodoComponent', () => {
  let component: TodoComponent;
  let fixture: ComponentFixture<TodoComponent>;
  let mockTodoService: MockTodoService;

  const mockTodos: TodoModel[] = [
    { id: 1, title: 'Test Todo 1', description: 'Desc 1', completed: false, dueDate: new Date(), createdDate: new Date() },
    { id: 2, title: 'Test Todo 2', description: 'Desc 2', completed: true, dueDate: new Date(), createdDate: new Date() },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TodoComponent], // Import the component itself as it's standalone
      providers: [
        { provide: TodoService, useClass: MockTodoService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TodoComponent);
    component = fixture.componentInstance;
    mockTodoService = TestBed.inject(TodoService) as unknown as MockTodoService;

    // Reset spies and default mock implementations for getTodos before each test
    mockTodoService.getTodos.and.returnValue(Promise.resolve({ todos: [...mockTodos], total: mockTodos.length, next: false, privias: false }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Displaying Todos', () => {
    it('should call loadTodos on ngOnInit and display todos', fakeAsync(() => {
      fixture.detectChanges(); // Trigger ngOnInit
      tick(1500); // Advance time for the setInterval in ngOnInit
      fixture.detectChanges(); // Update view with loaded todos

      expect(mockTodoService.getTodos).toHaveBeenCalledWith(1, 10, Filters.ALL, '');
      expect(component.todos().length).toBe(mockTodos.length);

      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      expect(todoElements.length).toBe(mockTodos.length);
      expect(todoElements[0].querySelector('h2').textContent).toContain('Test Todo 1');
      expect(todoElements[1].querySelector('h2').textContent).toContain('Test Todo 2');
    }));

    it('should show skeleton loaders initially then hide them after todos are loaded', fakeAsync(() => {
      component.isTodoExsist.set(false); // Simulate initial state before ngOnInit fully completes
      // mockTodoService.getTodos.and.returnValue(new Promise(() => {})); // Prevent immediate resolution
      fixture.detectChanges(); // ngOnInit starts, interval set up

      let skeletons = fixture.nativeElement.querySelectorAll('div.animate-pulse');
      expect(skeletons.length).toBe(component.skelitenSize().length); // Check initial skeletons
      expect(component.isTodoExsist()).toBe(false);

      tick(1500); // Advance time for the setInterval in ngOnInit to call loadTodos
      fixture.detectChanges(); // Update view with loaded todos

      skeletons = fixture.nativeElement.querySelectorAll('div.animate-pulse');
      expect(skeletons.length).toBe(0); // Skeletons should be gone
      expect(component.isTodoExsist()).toBe(true);
      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      expect(todoElements.length).toBe(mockTodos.length); // Todos should be displayed
    }));

    it('should display no todo items if service returns empty list after initial load', fakeAsync(() => {
      mockTodoService.getTodos.and.returnValue(Promise.resolve({ todos: [], total: 0, next: false, privias: false }));
      fixture.detectChanges();
      tick(1500);
      fixture.detectChanges();

      expect(component.todos().length).toBe(0);
      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      expect(todoElements.length).toBe(0);
      expect(component.isTodoExsist()).toBe(true);
    }));
  });

  describe('Adding a Todo (Component Refresh)', () => {
    it('should refresh and display new todos when loadTodos is called', fakeAsync(() => {
      // Initial load
      fixture.detectChanges();
      tick(1500);
      fixture.detectChanges();
      expect(component.todos().length).toBe(mockTodos.length);

      // Simulate new data from service for subsequent loadTodos call
      const newMockTodos = [...mockTodos, { id: 3, title: 'Test Todo 3', description: 'Desc 3', completed: false, dueDate: new Date(), createdDate: new Date() }];
      mockTodoService.getTodos.and.returnValue(Promise.resolve({ todos: newMockTodos, total: newMockTodos.length, next: false, privias: false }));

      component.loadTodos(); // Manually call loadTodos to simulate a refresh trigger
      tick(); // Allow promises to resolve
      fixture.detectChanges();

      expect(mockTodoService.getTodos).toHaveBeenCalledTimes(2); // Initial + manual call
      expect(component.todos().length).toBe(newMockTodos.length);
      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      expect(todoElements.length).toBe(newMockTodos.length);
      // Check for the new todo's title
      const newTodoElement = Array.from(todoElements).find((el: Element) => el.querySelector('h2')!.textContent!.includes('Test Todo 3'));
      expect(newTodoElement).toBeTruthy();
    }));
  });

  describe('Deleting a Todo', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges(); // Initial load
      tick(1500);
      fixture.detectChanges();
    }));

    it('should first show confirmation dialog when delete icon is clicked', () => {
      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      const deleteButton = todoElements[0].querySelector('button[title="Delete"]');
      expect(deleteButton).toBeTruthy();

      (deleteButton as HTMLElement).click();
      fixture.detectChanges();

      expect(component.isDeleteId()).toBe(mockTodos[0].id);
      const confirmationDialog = fixture.nativeElement.querySelector('.absolute.inset-0.backdrop-blur-xs');
      expect(confirmationDialog).toBeTruthy();
      expect(confirmationDialog.querySelector('h1').textContent).toContain('Are you sure');
    });

    it('should call service.deleteTodo and reload todos when deletion is confirmed', fakeAsync(() => {
      const todoToDelete = mockTodos[0];
      component.isDeleteId.set(todoToDelete.id); // Manually set to show dialog for test
      fixture.detectChanges();

      const confirmationYesButton = fixture.nativeElement.querySelector('.absolute.inset-0.backdrop-blur-xs button.bg-red-500');
      expect(confirmationYesButton).toBeTruthy();

      mockTodoService.deleteTodo.calls.reset();
      mockTodoService.getTodos.calls.reset();
      mockTodoService.getTodos.and.returnValue(Promise.resolve({ todos: [mockTodos[1]], total: 1, next: false, privias: false }));

      (confirmationYesButton as HTMLElement).click();
      tick();
      fixture.detectChanges();

      expect(mockTodoService.deleteTodo).toHaveBeenCalledWith(todoToDelete.id);
      expect(mockTodoService.getTodos).toHaveBeenCalledTimes(1);
      expect(component.todos().length).toBe(1);
      expect(component.todos()[0].id).toBe(mockTodos[1].id);
      expect(component.isDeleteId()).toBe(-1);
    }));

    it('should hide confirmation and not call service.deleteTodo if "No" is clicked on confirmation', fakeAsync(() => {
      component.isDeleteId.set(mockTodos[0].id);
      fixture.detectChanges();

      const confirmationNoButton = fixture.nativeElement.querySelector('.absolute.inset-0.backdrop-blur-xs button.bg-green-400');
      expect(confirmationNoButton).toBeTruthy();

      mockTodoService.deleteTodo.calls.reset();

      (confirmationNoButton as HTMLElement).click();
      tick();
      fixture.detectChanges();

      expect(mockTodoService.deleteTodo).not.toHaveBeenCalled();
      expect(component.isDeleteId()).toBe(-1);
      const confirmationDialog = fixture.nativeElement.querySelector('.absolute.inset-0.backdrop-blur-xs');
      expect(confirmationDialog).toBeFalsy(); // Dialog should be gone
    }));
  });

  describe('Toggling Todo Completion', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges(); // Initial load
      tick(1500);
      fixture.detectChanges();
    }));

    it('should call service.checkTodo and reload todos when a todo checkbox is changed', fakeAsync(() => {
      const todoToToggle = component.todos()[0]; // First todo, initially not completed based on mockTodos
      expect(todoToToggle.completed).toBe(false);

      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      const firstTodoElement = todoElements[0];
      const checkbox = firstTodoElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(false);

      mockTodoService.checkTodo.calls.reset();
      mockTodoService.getTodos.calls.reset();

      // Simulate getTodos after toggle returns the todo with updated status
      const updatedTodo = { ...todoToToggle, completed: true };
      const otherTodo = component.todos()[1];
      mockTodoService.getTodos.and.returnValue(Promise.resolve({ todos: [updatedTodo, otherTodo], total: 2, next: false, privias: false }));

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change'));
      tick(); // allow checkTodo and subsequent loadTodos to resolve
      fixture.detectChanges();

      expect(mockTodoService.checkTodo).toHaveBeenCalledWith(todoToToggle.id, true);
      expect(mockTodoService.getTodos).toHaveBeenCalledTimes(1); // Called by component.completedCheckbox -> component.loadTodos

      // Verify component state updated
      expect(component.todos()[0].completed).toBe(true);

      // Verify UI updated (checkbox is checked, style might be applied if not for mock getTodos)
      const updatedCheckbox = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border')[0].querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(true);
      // Further UI check (e.g. line-through style)
      const titleElement = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border')[0].querySelector('h2');
      expect(titleElement.classList.contains('line-through')).toBe(true); // Based on [ngClass] in HTML
    }));

    it('should correctly toggle from true to false as well', fakeAsync(() => {
      const todoToToggle = component.todos()[1]; // Second todo, initially completed
      expect(todoToToggle.completed).toBe(true);

      const todoElements = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border');
      const secondTodoElement = todoElements[1];
      const checkbox = secondTodoElement.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(checkbox).toBeTruthy();
      expect(checkbox.checked).toBe(true); // Initial state from mock

      mockTodoService.checkTodo.calls.reset();
      mockTodoService.getTodos.calls.reset();

      const updatedTodo = { ...todoToToggle, completed: false };
      const firstTodo = component.todos()[0];
      mockTodoService.getTodos.and.returnValue(Promise.resolve({ todos: [firstTodo, updatedTodo], total: 2, next: false, privias: false }));

      checkbox.checked = false;
      checkbox.dispatchEvent(new Event('change'));
      tick();
      fixture.detectChanges();

      expect(mockTodoService.checkTodo).toHaveBeenCalledWith(todoToToggle.id, false);
      expect(mockTodoService.getTodos).toHaveBeenCalledTimes(1);
      expect(component.todos()[1].completed).toBe(false);

      const updatedCheckbox = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border')[1].querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(updatedCheckbox.checked).toBe(false);
      const titleElement = fixture.nativeElement.querySelectorAll('div.w-full.max-w-2xl.bg-white.border')[1].querySelector('h2');
      expect(titleElement.classList.contains('line-through')).toBe(false);
    }));
  });
});
