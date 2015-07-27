import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Subject } from 'rxjs/internal/Subject';
import debounce from 'lodash/debounce';

export interface FlexCanvasInit {
  (
    canvas: HTMLCanvasElement,
    updateSize$: Observable<[number, number]>,
    destroy$: Observable<void>,
    container: HTMLDivElement
  ): Promise<void> | void;
}

interface FlexCanvasProps {
  init: FlexCanvasInit;
  renderMoreContent?: (wrapperRef: RefObject<HTMLDivElement>) => JSX.Element | null;
}

function useWrapperRef(
  wrapperRef: RefObject<HTMLDivElement>,
  sizeSubject: Subject<[number, number]>
) {
  const [observer] = useState<ResizeObserver>(new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    sizeSubject.next([width, height].map(val => Math.floor(val)) as [number, number]);
  }));

  useEffect(() => {
    const observe = (div: HTMLDivElement | null) => {
      div && observer.observe(div);
      return () => {
        div && observer?.unobserve(div);
        observer?.disconnect();
      };
    };
    return observe(wrapperRef.current);
  }, []);
}

function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement>,
  wrapperRef: RefObject<HTMLDivElement>,
  init: FlexCanvasInit
) {
  const debouncedInit = useCallback(debounce(init, 100), [init]);
  const [sizeSubject] = useState(new BehaviorSubject<[number, number]>([300, 150]));
  const [destroySubject] = useState(new Subject<void>());

  useWrapperRef(wrapperRef, sizeSubject);
  useLayoutEffect(() => {
    canvasRef.current && debouncedInit(
      canvasRef.current,
      sizeSubject.asObservable(),
      destroySubject.asObservable(),
      wrapperRef.current as HTMLDivElement
    );
    return () => {
      destroySubject.next();
    };
  }, []);
}

/**
 * React.StrictMode开发模式下组件会初始化两次，会导致init重复调用而导致渲染问题。
 * 因而利用debounce函数，并且结合BehaviorSubject来解决该问题，
 */

export default function FlexCanvas({ init, renderMoreContent }: FlexCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useCanvas(canvasRef, wrapperRef, init);

  return (
    <div className="canvas-container" ref={wrapperRef}>
      <div className="canvas-container-inner">
        <canvas ref={canvasRef} />
      </div>
      {renderMoreContent?.(wrapperRef)}
    </div>
  );
}
