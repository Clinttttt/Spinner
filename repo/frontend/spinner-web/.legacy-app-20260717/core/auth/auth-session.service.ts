import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  readonly isOwnerSignedIn = signal(false);
}
