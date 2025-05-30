import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'todolist',
        
    },{
        path: 'todolist',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./home/home').then((module) => module.Home);
        },
    }
];
