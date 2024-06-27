import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { Mesh, Object3D, PlaneGeometry } from 'gpu-curtains'
import { shadowedParticlesVs } from '../shaders/shadowed-particles.wgsl'

export class ShadowedParticlesScene extends DemoScene {
  constructor({ renderer, nbInstances = 100_000 }) {
    super({ renderer })
    this.nbInstances = nbInstances
  }

  init() {
    this.section = document.querySelector('#shadowed-particles-scene')

    // particle system radius
    this.radius = 50

    this.renderer.camera.position.z = 375

    super.init()
  }

  addScrollTrigger() {
    this.scrollTrigger = ScrollTrigger.create({
      trigger: this.section,
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

  setupWebGPU() {
    this.createParticles()
  }

  destroyWebGPU() {
    this.particlesSystem?.remove()
  }

  createParticles() {
    const geometry = new PlaneGeometry({
      instancesCount: this.nbInstances,
    })

    this.particlesSystem = new Mesh(this.renderer, {
      label: 'Shadowed particles system',
      geometry,
      frustumCulling: false,
      shaders: {
        vertex: {
          code: shadowedParticlesVs,
        },
      },
      uniforms: {
        params: {
          struct: {
            radius: {
              type: 'f32',
              value: this.radius * 10, // space them a bit
            },
          },
        },
      },
    })

    // just to check the billboarding is actually working
    this.cameraPivot = new Object3D()
    this.cameraPivot.parent = this.renderer.scene
    this.renderer.camera.position.z = this.radius * 15
    this.renderer.camera.parent = this.cameraPivot
  }

  onRender() {
    if (this.cameraPivot) {
      this.cameraPivot.rotation.y += 0.01
    }
  }
}
