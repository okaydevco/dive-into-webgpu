import { Plane, Sampler, ShaderPass } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { planesFs, planesVs } from '../shaders/gallery-planes.wgsl'
import { galleryShaderPassFs } from '../shaders/gallery-shader-pass.wgsl'

export class PlanesScene extends DemoScene {
  constructor({ renderer }) {
    super({ renderer })
  }

  init() {
    this.section = document.querySelector('#planes-scene')

    this.planes = []
    this.planesElements = document.querySelectorAll('#planes-scene .plane')

    super.init()
  }

  setupWebGPU() {
    this.planesElements.forEach((planeEl, index) => {
      const plane = new Plane(this.renderer, planeEl, {
        label: `Plane ${index}`,
        shaders: {
          vertex: {
            code: planesVs,
          },
          fragment: {
            code: planesFs,
          },
        },
        texturesOptions: {
          generateMips: true,
        },
      })

      this.planes.push(plane)
    })

    this.shaderPass = new ShaderPass(this.renderer, {
      label: 'Distortion shader pass',
      shaders: {
        fragment: {
          code: galleryShaderPassFs,
        },
      },
      samplers: [
        new Sampler(this.renderer, {
          label: 'Clamp sampler',
          name: 'clampSampler',
          addressModeU: 'clamp-to-edge',
          addressModeV: 'clamp-to-edge',
        }),
      ],
    })
  }

  destroyWebGPU() {
    this.planes.forEach((plane) => {
      plane.remove()
    })

    this.shaderPass.remove()
  }

  addScrollTrigger() {
    this.scrollTrigger = ScrollTrigger.create({
      trigger: '#planes-scene',
      onToggle: ({ isActive }) => {
        this.onSceneVisibilityChanged(isActive)
      },
    })

    this.onSceneVisibilityChanged(this.scrollTrigger.isActive)
  }

  removeScrollTrigger() {
    this.scrollTrigger.kill()
  }

  onSceneVisibilityChanged(isVisible) {
    if (isVisible) {
      this.section.classList.add('is-visible')
      this.renderer.shouldRenderScene = true
    } else {
      this.section.classList.remove('is-visible')
      this.renderer.shouldRenderScene = false
    }
  }
}
