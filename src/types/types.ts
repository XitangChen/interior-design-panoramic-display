import { Subject } from 'rxjs/internal/Subject';

export type UnwrapSubject<T> = T extends Subject<infer P> ? P : T;
