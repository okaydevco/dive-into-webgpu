export class DemoScene {
  constructor({ renderer }) {
    if (!renderer) {
      throw new Error('DemoScene: the renderer parameters is mandatory!')
    }

    this.renderer = renderer

    this.init()
  }

  init() {
    this.addEvents()
    this.addScrollTrigger()
    this.addEnteringAnimation()
  }

  get isWebGPUActive() {
    return !!this.renderer.deviceManager.device
  }

  get shouldRender() {
    return this.renderer.shouldRenderScene && this.renderer.shouldRender
  }

  initWebGPU() {
    if (this.isWebGPUActive) {
      this.setupWebGPU()
    }
  }

  setupWebGPU() {}

  removeWebGPU() {
    if (this.isWebGPUActive) {
      this.destroyWebGPU()
    }
  }

  destroyWebGPU() {}

  addEvents() {}
  removeEvents() {}

  addScrollTrigger() {}
  removeScrollTrigger() {}

  onSceneVisibilityChanged(isVisible) {}

  addEnteringAnimation() {}
  removeEnteringAnimation() {}

  onRender() {}
  onScroll(scrollDelta) {}

  destroy() {
    this.removeEvents()
    this.removeScrollTrigger()
    this.removeEnteringAnimation()
    this.removeWebGPU()

    this.renderer.destroy()
  }
}
