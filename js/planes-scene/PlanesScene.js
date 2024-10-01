import { Plane, Sampler, ShaderPass } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { planesFs, planesVs } from '../shaders/gallery-planes.wgsl'
import { galleryShaderPassFs } from '../shaders/gallery-shader-pass.wgsl'
import { gsap } from 'gsap'

export class PlanesScene extends DemoScene {
  constructor({ renderer }) {
    super({ renderer })
  }

  init() {
    this.section = document.querySelector('#planes-scene')

    this.planes = []
    this.planesElements = document.querySelectorAll('#planes-scene .plane')

    this.velocity = {
      weightRatio: 0.75, // the smaller, the closer to the original velocity value
      weighted: 0,
    }

    super.init()
  }

  setupWebGPU() {
    // keep track of the number of planes currently animated
    let nbAnimatedPlanes = 0

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
        transparent: true,
        uniforms: {
          params: {
            struct: {
              opacity: {
                type: 'f32',
                value: 1,
              },
            },
          },
        },
      })

      plane.userData.animationTimeline = gsap
        .timeline({
          paused: true,
        })
        .fromTo(
          plane.uniforms.params.opacity,
          { value: 0 },
          {
            value: 1,
            duration: 1.5,
            ease: 'expo.out',
            onStart: () => {
              nbAnimatedPlanes--
            },
            onUpdate: () => {
              const textureScale = 1.5 - plane.uniforms.params.opacity.value * 0.5
              plane.domTextures[0]?.scale.set(textureScale, textureScale, 1)
            },
          }
        )

      plane.onReEnterView(() => {
        nbAnimatedPlanes++
        plane.userData.animationTimeline.delay(nbAnimatedPlanes * 0.1)
        plane.userData.animationTimeline.restart(true)
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
      uniforms: {
        deformation: {
          struct: {
            maxStrength: {
              type: 'f32',
              value: 0.1,
            },
            scrollStrength: {
              type: 'f32',
              value: 0,
            },
          },
        },
      },
    })
  }

  destroyWebGPU() {
    this.planes.forEach((plane) => {
      plane.userData.animationTimeline.kill()
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
      this.timeline?.restart(true)
    } else {
      this.section.classList.remove('is-visible')
      this.renderer.shouldRenderScene = false
      this.timeline?.paused()
    }
  }

  addEnteringAnimation() {
    this.autoAlphaElements = this.section.querySelectorAll('.gsap-auto-alpha')

    this.timeline = gsap
      .timeline({
        paused: true,
      })
      .fromTo(
        this.autoAlphaElements,
        {
          autoAlpha: 0,
        },
        {
          autoAlpha: 1,
          duration: 1,
          stagger: 0.2,
          ease: 'power2.inOut',
        },
        0.25
      )
  }

  removeEnteringAnimation() {
    this.timeline.kill()
  }

  onScroll(velocity = 0) {
    // no weight if current velocity is null
    const weight = velocity ? Math.abs(velocity - this.velocity.weighted) * this.velocity.weightRatio : 0

    // apply weight
    this.velocity.weighted = (this.velocity.weighted * weight + Math.abs(velocity)) / (weight + 1)

    if (this.shaderPass) {
      this.shaderPass.uniforms.deformation.scrollStrength.value = this.velocity.weighted * 0.05
    }
  }
}
