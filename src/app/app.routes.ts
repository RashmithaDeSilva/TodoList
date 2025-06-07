import { Routes } from '@angular/router';

export const routes: Routes = [
    // Home router
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () => {
            return import('./home/home').then((module) => module.Home);
        },
    },

    // Wildcard route for 404 Not Found
    {
        path: '**',
        loadComponent: () => import('./components/notfound/notfound').then((module) => module.Notfound),
    },
];
