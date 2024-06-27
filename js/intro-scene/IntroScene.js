import { BoxGeometry, Mesh, SphereGeometry, Vec2, Vec3 } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { gsap } from 'gsap'
import { introMeshFs, introMeshVs } from '../shaders/intro-meshes.wgsl'

export class IntroScene extends DemoScene {
  constructor({ renderer, nbMeshes = 500 }) {
    super({ renderer })

    this.nbMeshes = nbMeshes
  }

  init() {
    this.section = document.querySelector('#intro-scene')

    // default camera position is (0, 0, 10)
    this.renderer.camera.position.z = 80

    // feel free to tweak the light position and see how it goes
    // this.lightPosition = new Vec3(50, 20, 100)

    this.lightPosition = this.renderer.camera.position.clone().multiplyScalar(2)
    this.currentLightPosition = this.lightPosition.clone()

    this.meshes = []

    super.init()
  }

  setupWebGPU() {
    this.createMeshes()
  }

  destroyWebGPU() {
    this.meshes.forEach((mesh) => mesh.remove())
  }

  addEvents() {
    this._onPointerMoveHandler = this.onPointerMove.bind(this)
    window.addEventListener('mousemove', this._onPointerMoveHandler)
    window.addEventListener('touchmove', this._onPointerMoveHandler)
  }

  removeEvents() {
    window.removeEventListener('mousemove', this._onPointerMoveHandler)
    window.removeEventListener('touchmove', this._onPointerMoveHandler)
  }

  addScrollTrigger() {
    this.scrollTrigger = ScrollTrigger.create({
      trigger: this.renderer.domElement.element,
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
    this.animations = {
      meshesPositionProgress: 0,
      lightIntensity: 1,
    }

    this.autoAlphaElements = this.section.querySelectorAll('.gsap-auto-alpha')

    this.timeline = gsap
      .timeline({
        paused: true,
        delay: 0.5,
      })
      .to(this.animations, {
        meshesPositionProgress: 1,
        ease: 'expo.out',
        duration: 2,
      })
      .fromTo(
        this.animations,
        {
          lightIntensity: 1,
        },
        {
          lightIntensity: 0.6,
          duration: 0.5,
          onUpdate: () => {
            this.meshes.forEach((mesh) => {
              mesh.uniforms.directionalLight.intensity.value = this.animations.lightIntensity
            })
          },
        },
        1
      )
      .fromTo(
        this.autoAlphaElements,
        {
          autoAlpha: 0,
        },
        {
          autoAlpha: 1,
          duration: 1,
          stagger: 0.125,
          ease: 'power2.inOut',
        },
        0.75
      )
  }

  removeEnteringAnimation() {
    this.timeline.kill()
  }

  createMeshes() {
    // now add meshes to our scene
    const boxGeometry = new BoxGeometry()
    const sphereGeometry = new SphereGeometry()

    const grey = new Vec3(0.35)
    const gold = new Vec3(184 / 255, 162 / 255, 9 / 255)
    const dark = new Vec3(0.05)

    for (let i = 0; i < this.nbMeshes; i++) {
      const random = Math.random()
      const meshColor = random < 0.5 ? grey : random > 0.85 ? dark : gold

      const mesh = new Mesh(this.renderer, {
        label: `Cube ${i}`,
        geometry: Math.random() > 0.33 ? boxGeometry : sphereGeometry,
        shaders: {
          vertex: {
            code: introMeshVs,
          },
          fragment: {
            code: introMeshFs,
          },
        },
        uniforms: {
          ambientLight: {
            visibility: ['fragment'],
            struct: {
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
              intensity: {
                type: 'f32',
                value: 0.05,
              },
            },
          },
          directionalLight: {
            visibility: ['fragment'],
            struct: {
              position: {
                type: 'vec3f',
                value: this.lightPosition,
              },
              intensity: {
                type: 'f32',
                value: 1,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
            },
          },
          shading: {
            visibility: ['fragment'],
            struct: {
              color: {
                type: 'vec3f',
                value: meshColor,
              },
              opacity: {
                type: 'f32',
                value: 1,
              },
            },
          },
        },
      })

      // set a random initial rotation
      mesh.rotation.set(Math.random(), Math.random(), Math.random())

      // a random depth position based on the camera position along Z axis
      const zPosition = (Math.random() - 0.5) * this.renderer.camera.position.z

      // store current and end positions into two Vec3
      mesh.userData.currentPosition = new Vec3()
      mesh.userData.endPosition = new Vec3()

      const setMeshEndPosition = (zPosition) => {
        // get the visible width and height in world unit at given depth
        const visibleSize = this.renderer.camera.getVisibleSizeAtDepth(zPosition)

        mesh.userData.endPosition.set(
          visibleSize.width * (Math.random() * 0.5) * Math.sign(Math.random() - 0.5),
          visibleSize.height * (Math.random() * 0.5) * Math.sign(Math.random() - 0.5),
          zPosition
        )
      }

      // updates the positions right away AND after resize!
      setMeshEndPosition(zPosition)

      mesh.onAfterResize(() => {
        setMeshEndPosition(zPosition)
      })

      this.meshes.push(mesh)
    }
  }

  onPointerMove(e) {
    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e
    const { width, height } = this.renderer.boundingRect
    const worldPosition = this.renderer.camera.getVisibleSizeAtDepth(this.currentLightPosition.z)

    const normalizedScreenCords = new Vec2((clientX - width * 0.5) / width, (clientY - height * 0.5) / height)

    this.currentLightPosition.set(
      normalizedScreenCords.x * worldPosition.width * 0.5,
      normalizedScreenCords.y * worldPosition.height * -0.5,
      this.currentLightPosition.z
    )
  }

  onRender() {
    // lerp light position for a more pleasant result
    this.lightPosition.lerp(this.currentLightPosition, 0.05)

    this.meshes.forEach((mesh) => {
      mesh.userData.currentPosition
        .copy(mesh.userData.endPosition)
        .multiplyScalar(this.animations.meshesPositionProgress)

      mesh.position.copy(mesh.userData.currentPosition)

      mesh.rotation.add(
        mesh.userData.currentPosition.normalize().multiplyScalar((1.025 - this.animations.meshesPositionProgress) * 0.2)
      )

      mesh.uniforms.shading.opacity.value = this.animations.meshesPositionProgress
    })
  }
}
