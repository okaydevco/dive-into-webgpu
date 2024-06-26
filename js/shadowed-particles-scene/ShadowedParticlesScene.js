import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { BindGroup, BufferBinding, ComputePass, Mesh, PlaneGeometry } from 'gpu-curtains'
import { shadowedParticlesVs } from '../shaders/shadowed-particles.wgsl'
import { computeParticles } from '../shaders/compute-particles.wgsl'

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
    this.createComputePasses()
    this.createParticles()
  }

  destroyWebGPU() {
    // destroy both compute pass and compute bind group
    this.computePass?.destroy()
    this.computeBindGroup?.destroy()

    this.particlesSystem?.remove()
  }

  async createComputePasses() {
    this.initComputeBuffer = new BufferBinding({
      label: 'Compute particles init buffer',
      name: 'initParticles',
      bindingType: 'storage',
      access: 'read_write', // we want a readable AND writable buffer!
      usage: ['vertex'], // we're going to use this buffer as a vertex buffer along default usages
      visibility: ['compute'],
      struct: {
        position: {
          type: 'array<vec4f>',
          value: new Float32Array(this.nbInstances * 4),
        },
        velocity: {
          type: 'array<vec4f>',
          value: new Float32Array(this.nbInstances * 4),
        },
      },
    })

    // update buffer, cloned from init one
    this.updateComputeBuffer = this.initComputeBuffer.clone({
      ...this.initComputeBuffer.options,
      label: 'Compute particles update buffer',
      name: 'particles',
    })

    this.computeBindGroup = new BindGroup(this.renderer, {
      label: 'Compute particles bind group',
      bindings: [this.initComputeBuffer, this.updateComputeBuffer],
      uniforms: {
        params: {
          visibility: ['compute'],
          struct: {
            radius: {
              type: 'f32',
              value: this.radius,
            },
            maxLife: {
              type: 'f32',
              value: 60, // in frames
            },
          },
        },
      },
    })

    const computeInitDataPass = new ComputePass(this.renderer, {
      label: 'Compute initial data',
      shaders: {
        compute: {
          code: computeParticles,
          entryPoint: 'setInitData',
        },
      },
      dispatchSize: Math.ceil(this.nbInstances / 256),
      bindGroups: [this.computeBindGroup],
      autoRender: false, // we don't want to run this pass each frame
    })

    // we should wait for pipeline compilation!
    await computeInitDataPass.material.compileMaterial()

    // now run the compute pass just once
    this.renderer.renderOnce([computeInitDataPass])

    this.computePass = new ComputePass(this.renderer, {
      label: 'Compute particles pass',
      shaders: {
        compute: {
          code: computeParticles,
          entryPoint: 'updateData',
        },
      },
      dispatchSize: Math.ceil(this.nbInstances / 256),
      bindGroups: [this.computeBindGroup],
    })

    // we're done with our first compute pass, remove it
    computeInitDataPass.remove()
  }

  createParticles() {
    const geometry = new PlaneGeometry({
      instancesCount: this.nbInstances,
      vertexBuffers: [
        {
          // use instancing
          stepMode: 'instance',
          name: 'instanceAttributes',
          buffer: this.updateComputeBuffer.buffer, // pass the compute buffer right away
          attributes: [
            {
              name: 'particlePosition',
              type: 'vec4f',
              bufferFormat: 'float32x4',
              size: 4,
            },
            {
              name: 'particleVelocity',
              type: 'vec4f',
              bufferFormat: 'float32x4',
              size: 4,
            },
          ],
        },
      ],
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
    })
  }
}
