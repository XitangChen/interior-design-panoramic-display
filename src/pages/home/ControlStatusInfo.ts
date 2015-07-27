export class ControlStatusInfo {
  #audioStopped = true;

  #disableRotating = false;

  get stopped() {
    return this.#audioStopped;
  }

  set stopped(value: boolean) {
    this.#audioStopped = value;
  }

  get disableRotating() {
    return this.#disableRotating;
  }

  set disableRotating(value: boolean) {
    this.#disableRotating = value;
  }
}
