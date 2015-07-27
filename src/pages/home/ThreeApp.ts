import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject, Subject, debounceTime, filter, first, from, switchMap, takeUntil, tap } from 'rxjs';
import { UnwrapSubject } from '@/types/types';
import { ControlStatusInfo } from './ControlStatusInfo';

function createScene() {
  const scene = new THREE.Scene();
  return scene;
}

function createCameras(aspect: number, target: THREE.Vector3) {
  const camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  camera.position.set(-0.87, 0.03, 0.4);
  camera.lookAt(target);

  return { camera };
}

function createRenderer(canvas: HTMLCanvasElement, viewportSize: [number, number]) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(...viewportSize);
  renderer.setPixelRatio(window.devicePixelRatio);
  return renderer;
}

async function updateTexture(mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>, img: string) {
  const { material } = mesh;

  try {
    await new Promise<THREE.Texture>((resolve, reject) => {
      const texture = new THREE.TextureLoader().load(img, resolve, undefined, reject);

      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
    });
  } catch {
    material.map = new THREE.Texture();
  }

  material.needsUpdate = true;
}

function createPageVisibilityEventObservable(destroy$: Observable<void>) {
  const subject = new Subject<boolean>();
  const supportInfo = [
    ['hidden', 'visibilitychange'],
    ['msHidden', 'msvisibilitychange'],
    ['webKitHidden', 'webkitvisibilitychange'],
    ['oHidden', 'ovisibilitychange']
  ].find(([key]) => key in document);

  if (supportInfo) {
    const [key, eventName] = supportInfo;
    const handler = () => subject.next(Boolean((document as unknown as { [K: string]: unknown; })[key]));
    const useCapture = false;

    document.addEventListener(eventName, handler, useCapture);
    destroy$.pipe(first()).subscribe(() => {
      () => document.removeEventListener(eventName, handler, useCapture);
    });
  }

  return subject.asObservable();
}

function addObjects(scene: THREE.Scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(25, 50, 50),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.BackSide
    })
  );

  scene.add(mesh);

  return { mesh };
}

function animate(render: (time: number) => void, destroy$: Observable<void>) {
  let requestId = NaN;
  let stopped = false;

  const handler = (time: number) => {
    render(time);
    !stopped && (requestId = requestAnimationFrame(handler));
  };

  requestId = requestAnimationFrame(handler);
  destroy$.pipe(first()).subscribe(() => {
    cancelAnimationFrame(requestId);
    stopped = true;
  });
}

export class ThreeApp {
  readonly #srcSubject = new BehaviorSubject<string>('');

  readonly #clickSubject = new Subject<{ type: string; status: boolean; }>();

  readonly #loadingSubject = new Subject<boolean>();

  readonly #controlStatusInfo = new ControlStatusInfo();

  readonly #audio = new THREE.Audio(new THREE.AudioListener());

  readonly loading$ = this.#loadingSubject.asObservable();

  #loading = true;

  get loading() { return this.#loading; }

  set loading(value: boolean) {
    const oldVal = this.#loading;

    if (oldVal !== value) {
      this.#loading = value;
      this.#loadingSubject.next(value);
    }
  }

  get mute() {
    return this.#controlStatusInfo.stopped;
  }

  constructor() {
    this.#controlStatusInfo.stopped = true;
  }

  async #loadAudio() {
    const audio = this.#audio;
    const audioBuffer = await new Promise<AudioBuffer>(
      (resolve, reject) => new THREE.AudioLoader().load('/media/琵琶语.mp3', resolve, undefined, reject)
    );

    audio.setBuffer(audioBuffer);
    audio.setLoop(true);
    audio.setVolume(0.3);
  }

  #initAudio(destroy$: Observable<void>, visibility$: Observable<boolean>) {
    const audio = this.#audio;
    const toggleAudio = this.#toggleAudio.bind(this);

    toggleAudio(this.#controlStatusInfo.stopped);
    visibility$.subscribe((stopped: boolean) => toggleAudio(this.#controlStatusInfo.stopped || stopped));
    destroy$.pipe(first()).subscribe(() => {
      audio.stop();
      audio.disconnect();
      audio.clear();
    });
  }

  async #toggleAudio(stopped: boolean) {
    const audio = this.#audio;

    if (!stopped && !audio.buffer) {
      await this.#loadAudio();
    }

    stopped ? audio.pause() : audio.play();
  }

  #getOnClickHandler({ container }: { container: HTMLElement; }) {
    const clickSubject = this.#clickSubject;
    const controlStatusInfo = this.#controlStatusInfo;
    const toggleAudio = this.#toggleAudio.bind(this);

    return ({ type, status }: UnwrapSubject<typeof clickSubject>) => {
      ({
        toggleAudio() {
          controlStatusInfo.stopped = status;
          toggleAudio(status);
        },
        toggleFullscreen() {
          ([
            !status
              ? [['exitFullScreen', 'mozCancelFullScreen', 'webkitExitFullscreen', 'msExitFullscreen'], document]
              : [['requestFullscreen', 'mozRequestFullScreen', 'webkitRequestFullscreen', 'msRequestFullscreen']]
          ] as [string[], Document?][]).some(([keys, document]) => {
            const target = document || container;
            return keys.some(key => {
              const handler = (target as unknown as { [K: string]: VoidFunction; })[key];
              return handler ? (handler.call(target), true) : false;
            });
          });
        },
        toggleRotation() { controlStatusInfo.disableRotating = status; }
      } as { [K: string]: VoidFunction; })[type]?.();
    };
  }

  #updateTexture(mesh: Parameters<typeof updateTexture>[0], destroy$: Observable<void>) {
    let currentSrc: string;

    this.#srcSubject.pipe(
      takeUntil(destroy$),
      debounceTime(100),
      filter(src => src !== currentSrc),
      tap(src => {
        this.loading = true;
        currentSrc = src;
      }),
      switchMap(src => from(updateTexture(mesh, src))),
      tap(() => (this.loading = false))
    ).subscribe();
  }

  updateTexture(src: string) {
    this.#srcSubject.next(src);
  }

  onClick(type: string, status: boolean) {
    this.#clickSubject.next({ type, status });
  }

  init(
    canvas: HTMLCanvasElement,
    updateSize$: Observable<[number, number]>,
    destroy$: Observable<void>,
    container: HTMLDivElement
  ) {
    const viewportSize = [canvas.offsetWidth, canvas.offsetHeight] as [number, number];
    const renderer = createRenderer(canvas, viewportSize);
    const scene = createScene();
    const { camera } = createCameras(viewportSize[0] / viewportSize[1], scene.position);

    Object.assign(new OrbitControls(camera, canvas), { enablePan: false, enableZoom: false }) as OrbitControls;
    updateSize$.pipe(takeUntil(destroy$)).subscribe(([width, height]) => {
      [width, height].forEach((val, i) => { viewportSize[i] = val; });
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });

    const { mesh } = addObjects(scene);

    this.#initAudio(destroy$, createPageVisibilityEventObservable(destroy$).pipe(takeUntil(destroy$)));
    this.#updateTexture(mesh, destroy$);
    this.#clickSubject.pipe(takeUntil(destroy$))
      .subscribe(this.#getOnClickHandler({ container }));

    const controlStatusInfo = this.#controlStatusInfo;
    const clock = new THREE.Clock();
    const refreshTime = 1 / 30;
    let timeS = 0;

    animate(() => {
      timeS += clock.getDelta();
      if (timeS > refreshTime) {
        renderer.render(scene, camera);
        !controlStatusInfo.disableRotating && mesh.rotateY(0.002);
        timeS = 0;
      }
    }, destroy$);
  }
}
