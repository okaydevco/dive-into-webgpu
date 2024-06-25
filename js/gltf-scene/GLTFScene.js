import { buildPBRShaders, DOMObject3D, GLTFLoader, GLTFScenesManager, Sampler, Vec3 } from 'gpu-curtains'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DemoScene } from '../DemoScene'
import {
  additionalFragmentHead,
  ambientContribution,
  lightContribution,
} from '../shaders/chunks/gltf-contributions.wgsl'
import { gsap } from 'gsap'

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
      .set(this.autoAlphaElements, { autoAlpha: 0 })
      .to(
        this.autoAlphaElements,
        {
          autoAlpha: 1,
          duration: 1,
          stagger: 0.125,
          ease: 'power2.inOut',
        },
        0.5
      )
  }

  removeEnteringAnimation() {
    this.timeline.kill()
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
    const { center, radius } = boundingBox

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

    // create a new sampler to address anisotropic issue
    this.anisotropicSampler = new Sampler(this.renderer, {
      label: 'Anisotropic sampler',
      name: 'anisotropicSampler',
      maxAnisotropy: 16,
    })

    this.gltfMeshes = this.gltfScenesManager.addMeshes((meshDescriptor) => {
      const { parameters } = meshDescriptor

      // disable frustum culling
      parameters.frustumCulling = false

      // add anisotropic sampler to the parameters
      parameters.samplers.push(this.anisotropicSampler)

      // assign our anisotropic sampler
      // to every textureSample calls used inside our buildPBRShaders function
      meshDescriptor.textures.forEach((texture) => {
        texture.sampler = this.anisotropicSampler.name
      })

      // add lights
      const lightPosition = new Vec3(-radius * 1.25, radius * 0.5, radius * 1.5)
      const lightPositionLength = lightPosition.length()

      parameters.uniforms = {
        ...parameters.uniforms,
        ...{
          ambientLight: {
            struct: {
              intensity: {
                type: 'f32',
                value: 0.35,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
            },
          },
          pointLight: {
            struct: {
              position: {
                type: 'vec3f',
                value: lightPosition,
              },
              intensity: {
                type: 'f32',
                value: lightPositionLength * 0.75,
              },
              color: {
                type: 'vec3f',
                value: new Vec3(1),
              },
              range: {
                type: 'f32',
                value: lightPositionLength * 2.5,
              },
            },
          },
        },
      }

      parameters.shaders = buildPBRShaders(meshDescriptor, {
        chunks: {
          additionalFragmentHead,
          ambientContribution,
          lightContribution,
        },
      })
    })
  }

  onRender() {
    // temp, will be changed later on
    this.parentNode.rotation.y += 0.01
  }
}
