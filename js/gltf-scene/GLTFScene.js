import { GLTFLoader, GLTFScenesManager } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'

export class GLTFScene extends DemoScene {
  constructor({ renderer }) {
    super({ renderer })
  }

  init() {
    this.section = document.querySelector('#gltf-scene')

    super.init()
  }

  setupWebGPU() {
    this.loadGLTF()
  }

  destroyWebGPU() {
    this.gltfScenesManager?.destroy()
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

  async loadGLTF() {
    this.gltfLoader = new GLTFLoader()
    this.gltf = await this.gltfLoader.loadFromUrl('./assets/gltf/metal_credit_card.glb')

    this.gltfScenesManager = new GLTFScenesManager({
      renderer: this.renderer,
      gltf: this.gltf,
    })

    const { scenesManager } = this.gltfScenesManager
    const { node, boundingBox } = scenesManager
    const { center, radius } = boundingBox

    // center the scenes manager parent node
    node.position.sub(center)

    // position camera based on glTF scene bounding box radius
    this.renderer.camera.position.z = radius * 2

    this.gltfMeshes = this.gltfScenesManager.addMeshes()
  }
}
