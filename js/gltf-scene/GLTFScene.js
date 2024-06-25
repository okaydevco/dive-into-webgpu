import { buildPBRShaders, DOMObject3D, GLTFLoader, GLTFScenesManager, Sampler, Vec2, Vec3 } from 'gpu-curtains'
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

    this.addButtonInteractions()
  }

  destroyWebGPU() {
    this.gltfScenesManager?.destroy()
    this.removeButtonInteractions()
  }

  addButtonInteractions() {
    this.buttons = this.section.querySelectorAll('#gltf-scene-controls button')

    // update card color
    this.cards = [
      { name: 'silver', baseColorFactor: new Vec3(1) },
      { name: 'gold', baseColorFactor: new Vec3(240 / 255, 140 / 255, 15 / 255) },
      { name: 'black', baseColorFactor: new Vec3(0.55) },
    ]

    // init with first color
    this.section.classList.add(this.cards[0].name)

    this._buttonClickHandler = this.onButtonClicked.bind(this)

    this.buttons.forEach((button) => {
      button.addEventListener('click', this._buttonClickHandler)
    })
  }

  removeButtonInteractions() {
    this.buttons.forEach((button) => {
      button.removeEventListener('click', this._buttonClickHandler)
    })
  }

  onButtonClicked(e) {
    const { target } = e
    const cardName = target.hasAttribute('data-card-name') ? target.getAttribute('data-card-name') : this.cards[0].name

    const card = this.cards.find((c) => c.name === cardName)

    // remove all previous card name classes
    this.cards.forEach((card) => {
      this.section.classList.remove(card.name)
    })

    // add active card class name
    this.section.classList.add(cardName)

    this.gltfMeshes?.forEach((mesh) => {
      mesh.uniforms.interaction.baseColorFactor.value.copy(card.baseColorFactor)
    })
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
          interaction: {
            struct: {
              baseColorFactor: {
                type: 'vec3f',
                value: this.cards[0].baseColorFactor.clone(),
              },
            },
          },
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

  addEvents() {
    this.gltfContainer = document.querySelector('#gltf-scene-object-container')

    this.mouse = {
      lerpedInteraction: new Vec2(),
      currentInteraction: new Vec2(),
      last: new Vec2(),
      multiplier: 0.015,
      isDown: false,
    }

    this._onPointerDownHandler = this.onPointerDown.bind(this)
    this._onPointerUpHandler = this.onPointerUp.bind(this)
    this._onPointerMoveHandler = this.onPointerMove.bind(this)

    this.section.addEventListener('mousedown', this._onPointerDownHandler)
    this.section.addEventListener('mouseup', this._onPointerUpHandler)
    this.gltfContainer.addEventListener('mousemove', this._onPointerMoveHandler)

    this.section.addEventListener('touchstart', this._onPointerDownHandler, {
      passive: true,
    })
    this.section.addEventListener('touchend', this._onPointerUpHandler)
    this.gltfContainer.addEventListener('touchmove', this._onPointerMoveHandler, {
      passive: true,
    })
  }

  removeEvents() {
    this.section.removeEventListener('mousedown', this._onPointerDownHandler)
    this.section.removeEventListener('mouseup', this._onPointerUpHandler)
    this.gltfContainer.removeEventListener('mousemove', this._onPointerMoveHandler)

    this.section.removeEventListener('touchstart', this._onPointerDownHandler, {
      passive: true,
    })
    this.section.removeEventListener('touchend', this._onPointerUpHandler)
    this.gltfContainer.removeEventListener('touchmove', this._onPointerMoveHandler, {
      passive: true,
    })
  }

  onPointerDown(e) {
    if (e.which === 1 || (e.targetTouches && e.targetTouches.length)) {
      this.mouse.isDown = true
    }

    const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e
    this.mouse.last.set(clientX, clientY)
  }

  onPointerUp() {
    this.mouse.isDown = false
  }

  onPointerMove(e) {
    if (this.mouse.isDown) {
      const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e

      const xDelta = clientX - this.mouse.last.x
      const yDelta = clientY - this.mouse.last.y

      this.mouse.currentInteraction.x += xDelta * this.mouse.multiplier
      this.mouse.currentInteraction.y += yDelta * this.mouse.multiplier

      // clamp X rotation
      this.mouse.currentInteraction.y = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, this.mouse.currentInteraction.y))

      this.mouse.last.set(clientX, clientY)
    }
  }

  onRender() {
    if (!this.shouldRender) return

    this.mouse.lerpedInteraction.lerp(this.mouse.currentInteraction, 0.2)

    this.parentNode.rotation.x = this.mouse.lerpedInteraction.y
    this.parentNode.rotation.y = this.mouse.lerpedInteraction.x
  }
}
