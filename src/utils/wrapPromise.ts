// eslint-disable-next-line no-shadow
const enum Status {
  PENDING = 'pending',
  ERROR = 'error',
  SUCCESS = 'success'
}

/**
 * 将promise包装，以便可以与React Suspense一起使用
 */
export function wrapPromise<T>(promise: Promise<T>) {
  let status = Status.PENDING;
  let response: T;

  const suspender = promise.then(
    data => {
      status = Status.SUCCESS;
      response = data;
    },
    err => {
      status = Status.ERROR;
      response = err;
    }
  );

  return {
    read() {
      return {
        [Status.PENDING]() {
          throw suspender;
        },
        [Status.ERROR]() {
          throw response;
        },
        [Status.SUCCESS]() {
          return response;
        }
      }[status]?.();
    }
  };
}
