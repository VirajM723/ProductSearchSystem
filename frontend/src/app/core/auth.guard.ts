import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthService)
    .check()
    .pipe(map((ok) => ok || router.createUrlTree(['/login'], { queryParams: { next: state.url } })));
};
