import { GPUCameraRenderer, GPUCurtains, GPUCurtainsRenderer } from 'gpu-curtains'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export class Demo {
  constructor() {
    gsap.registerPlugin(ScrollTrigger)

    // cap pixel ratio to improve performance
    this.pixelRatio = Math.min(1.5, window.devicePixelRatio)

    this.initLenis()

    this.gpuCurtains = new GPUCurtains({
      label: 'gpu-curtains demo',
      autoRender: false,
      watchScroll: false, // we'll use lenis instead
      pixelRatio: this.pixelRatio,
    })

    // needed to create the renderers
    this.deviceManager = this.gpuCurtains.deviceManager

    this.scenes = []

    this.createScenes()

    this.initWebGPU()

    gsap.ticker.add(this.render.bind(this))
    gsap.ticker.lagSmoothing(0)
  }

  initLenis() {
    this.lenis = new Lenis()

    this.lenis.on('scroll', ScrollTrigger.update)
  }

  async initWebGPU() {
    try {
      await this.gpuCurtains.setDevice()
    } catch (e) {
      //console.warn('WebGPU is not supported.')
      const disclaimer = document.createElement('div')
      disclaimer.setAttribute('id', 'no-webgpu-disclaimer')
      disclaimer.classList.add('tiny')
      disclaimer.innerText = 'Unfortunately, it looks like WebGPU is not (yet) supported by your browser or OS.'
      document.body.appendChild(disclaimer)
      document.body.classList.add('no-webgpu')
    }

    // init webgpu
    this.scenes.forEach((scene) => scene.initWebGPU())

    this.gpuCurtains.onRender(() => {
      this.scenes.forEach((scene) => scene.onRender())
    })
  }

  render(time) {
    this.lenis.raf(time * 1000)
    this.gpuCurtains.render()
  }

  createScenes() {
    // here we'll create each scenes

    this.lenis.on('scroll', (e) => {
      this.gpuCurtains.updateScrollValues({ x: 0, y: e.scroll })

      this.scenes.forEach((scene) => scene.onScroll(e.velocity, e.lastVelocity))
    })
  }

  destroyScenes() {
    this.scenes.forEach((scene) => scene.destroy())
  }

  destroy() {
    this.destroyScenes()
    this.gpuCurtains.destroy()
  }
}
