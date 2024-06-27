import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { BindGroup, BufferBinding, ComputePass, Mesh, PlaneGeometry, Vec2, Vec3 } from 'gpu-curtains'
import { particlesDepthPassShaders, shadowedParticlesFs, shadowedParticlesVs } from '../shaders/shadowed-particles.wgsl'
import { computeParticles } from '../shaders/compute-particles.wgsl'
import { ShadowMap } from './ShadowMap'

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

    this.setSizeDependentValues()
    this.renderer.onResize(this.setSizeDependentValues.bind(this))

    super.init()
  }

  setSizeDependentValues() {
    // account for scroll on mouse move
    this.offsetTop = this.renderer.boundingRect.top + window.pageYOffset
    this.visibleSize = this.renderer.camera.getVisibleSizeAtDepth()
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
      this.renderer.shouldRender = true
    } else {
      this.section.classList.remove('is-visible')
      this.renderer.shouldRender = false
    }
  }

  setupWebGPU() {
    const distance = this.renderer.camera.position.z

    this.shadowMap = new ShadowMap({
      renderer: this.renderer,
      depthTextureSize: 1024,
      light: {
        position: new Vec3(distance * 0.5, distance * 0.325, distance * 0.5),
        // add a bit of spacing on every side
        // to avoid out of view particles to be culled
        // by the shadow map orthographic matrix
        orthographicCamera: {
          left: distance * -1.05,
          right: distance * 1.05,
          top: distance * 1.05,
          bottom: distance * -1.05,
          near: 0.1,
          far: distance * 5,
        },
      },
    })

    this.createComputePasses()
    this.createParticles()
  }

  destroyWebGPU() {
    this.shadowMap.destroy()

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
      label: 'Compute instances bind group',
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
            mouse: {
              type: 'vec2f',
              value: this.mouse.lerped,
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

    // since we need this uniform in both the depth pass and regular pass
    // create a new buffer binding that will be shared by both materials
    const particlesParamsBindings = new BufferBinding({
      label: 'Params',
      name: 'params',
      bindingType: 'uniform',
      visibility: ['vertex'],
      struct: {
        size: {
          type: 'f32',
          value: 0.7,
        },
      },
    })

    this.particlesSystem = new Mesh(
      this.renderer,
      this.shadowMap.patchShadowReceivingParameters({
        label: 'Shadowed particles system',
        geometry,
        frustumCulling: false,
        shaders: {
          vertex: {
            code: shadowedParticlesVs,
          },
          fragment: {
            code: shadowedParticlesFs,
          },
        },
        uniforms: {
          shading: {
            struct: {
              lightColor: {
                type: 'vec3f',
                value: new Vec3(255 / 255, 240 / 255, 97 / 255),
              },
              darkColor: {
                type: 'vec3f',
                value: new Vec3(184 / 255, 162 / 255, 9 / 255),
              },
              shadowIntensity: {
                type: 'f32',
                value: 0.75,
              },
            },
          },
        },
        bindings: [particlesParamsBindings],
      })
    )

    this.shadowMap.addShadowCastingMesh(this.particlesSystem, {
      shaders: {
        vertex: {
          code: particlesDepthPassShaders,
          entryPoint: 'shadowMapVertex',
        },
        fragment: {
          code: particlesDepthPassShaders,
          entryPoint: 'shadowMapFragment',
        },
      },
      bindings: [particlesParamsBindings],
    })
  }

  addEvents() {
    this.mouse = {
      current: new Vec2(),
      lerped: new Vec2(),
      clamp: {
        min: new Vec2(-0.5),
        max: new Vec2(0.5),
      },
    }

    this._onPointerMoveHandler = this.onPointerMove.bind(this)
    window.addEventListener('mousemove', this._onPointerMoveHandler)
    window.addEventListener('touchmove', this._onPointerMoveHandler)
  }

  removeEvents() {
    window.removeEventListener('mousemove', this._onPointerMoveHandler)
    window.removeEventListener('touchmove', this._onPointerMoveHandler)
  }

  onPointerMove(e) {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e
    const { width, height } = this.renderer.boundingRect
    const scroll = window.pageYOffset

    // normalized between -0.5 and 0.5
    this.mouse.current.set(
      (clientX - width * 0.5) / width,
      -(clientY - (this.offsetTop - scroll) - height * 0.5) / height
    )

    // clamp
    this.mouse.current.clamp(this.mouse.clamp.min, this.mouse.clamp.max)

    // multiply by camera visible size
    this.mouse.current.x *= this.visibleSize.width
    this.mouse.current.y *= this.visibleSize.height
  }

  onRender() {
    this.mouse.lerped.lerp(this.mouse.current, 0.5)
  }
}
