import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

// If an admin action comes back 401, the session has run out. Send the
// user to the sign-in page and bring them back afterwards.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/auth/');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthCall) {
        const wasSignedIn = auth.isAdmin();
        auth.sessionEnded();
        if (wasSignedIn) toast.error('Your session ended. Please sign in again.');
        router.navigate(['/login'], { queryParams: { next: router.url } });
      }
      return throwError(() => err);
    })
  );
};
