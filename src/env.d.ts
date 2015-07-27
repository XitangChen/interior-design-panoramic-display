declare module '*.css' {
  const classes: { readonly [key: string]: string; };
  export default classes;
}

declare module '*.less' {
  const classes: { readonly [key: string]: string; };
  export default classes;
}

type UnwrapPromise<T> = T extends Promise<infer P> ? P : T;
