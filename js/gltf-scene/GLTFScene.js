import { buildShaders, DOMObject3D, GLTFLoader, GLTFScenesManager } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'

export class GLTFScene extends DemoScene {
  constructor({ renderer }) {
    super({ renderer })
  }

  init() {
    this.section = document.querySelector('#gltf-scene')
    this.gltfElement = document.querySelector('#gltf-scene-object')

    this.parentNode = new DOMObject3D(this.renderer, this.gltfElement, {
      watchScroll: false, // no need to watch the scroll
    })

    // add it to the scene graph
    this.parentNode.parent = this.renderer.scene

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
    this.gltf = await this.gltfLoader.loadFromUrl('/assets/gltf/metal_credit_card.glb')

    this.gltfScenesManager = new GLTFScenesManager({
      renderer: this.renderer,
      gltf: this.gltf,
    })

    const { scenesManager } = this.gltfScenesManager
    const { node, boundingBox } = scenesManager
    const { center } = boundingBox

    // center the scenes manager parent node
    node.position.sub(center)
    // add parent DOMObject3D as the scenes manager node parent
    node.parent = this.parentNode

    // copy new scenes bounding box into DOMObject3D own bounding box
    this.parentNode.boundingBox.copy(boundingBox)

    const updateParentNodeDepthPosition = () => {
      // move our parent node along the Z axis so the glTF front face lies at (0, 0, 0) instead of the glTF’s center
      this.parentNode.position.z = -0.5 * this.parentNode.boundingBox.size.z * this.parentNode.DOMObjectWorldScale.z
    }

    updateParentNodeDepthPosition()
    this.parentNode.onAfterDOMElementResize(() => updateParentNodeDepthPosition())

    this.gltfMeshes = this.gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      parameters.shaders = buildShaders(meshDescriptor)
    })
  }
}
