import { BoxGeometry, Mesh, Vec3 } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import { gsap } from 'gsap'

export class IntroScene extends DemoScene {
  constructor({ renderer, nbMeshes = 500 }) {
    super({ renderer })

    this.nbMeshes = nbMeshes
  }

  init() {
    this.section = document.querySelector('#intro-scene')

    // default camera position is (0, 0, 10)
    this.renderer.camera.position.z = 80

    this.meshes = []

    super.init()
  }

  setupWebGPU() {
    this.createMeshes()
  }

  destroyWebGPU() {
    this.meshes.forEach((mesh) => mesh.remove())
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
    }

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
  }

  removeEnteringAnimation() {
    this.timeline.kill()
  }

  createMeshes() {
    // now add meshes to our scene
    const boxGeometry = new BoxGeometry()
    for (let i = 0; i < this.nbMeshes; i++) {
      const mesh = new Mesh(this.renderer, {
        label: `Cube ${i}`,
        geometry: boxGeometry,
        frustumCulling: false,
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

  onRender() {
    if (!this.shouldRender) return

    this.meshes.forEach((mesh) => {
      mesh.userData.currentPosition
        .copy(mesh.userData.endPosition)
        .multiplyScalar(this.animations.meshesPositionProgress)

      mesh.position.copy(mesh.userData.currentPosition)

      mesh.rotation.add(
        mesh.userData.currentPosition.normalize().multiplyScalar((1.025 - this.animations.meshesPositionProgress) * 0.2)
      )
    })
  }
}
