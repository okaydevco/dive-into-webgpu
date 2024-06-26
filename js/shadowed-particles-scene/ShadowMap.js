import { BufferBinding, Mat4, RenderMaterial, RenderTarget, Sampler, Texture, Vec3 } from 'gpu-curtains'

export class ShadowMap {
  constructor({
    renderer,
    depthTextureSize = 1024,
    depthTextureFormat = 'depth24plus',
    light = {
      position: new Vec3(renderer?.camera.position.z || 1),
      target: new Vec3(),
      up: new Vec3(0, 1, 0),
      orthographicCamera: {
        left: renderer?.camera.position.z * -0.5,
        right: renderer?.camera.position.z * 0.5,
        top: renderer?.camera.position.z * 0.5,
        bottom: renderer?.camera.position.z * -0.5,
        near: 0.1,
        far: renderer?.camera.position.z * 5,
      },
    },
  }) {
    this.renderer = renderer

    this.depthTextureSize = depthTextureSize
    this.depthTextureFormat = depthTextureFormat

    // mandatory so we could use textureSampleCompare()
    // if we'd like to use MSAA, we would have to use an additional pass
    // to manually resolve the depth texture before using it
    this.sampleCount = 1

    this.light = light

    // keep track of the meshes that will cast shadows
    this.meshes = []

    this.createLightSource()
    this.createShadowMap()
    this.setDepthPass()
  }

  createLightSource() {
    // create the light view matrix
    // equivalent to Mat4().lookAt(this.light.position, this.light.target, this.light.up).invert() but faster
    this.light.viewMatrix = new Mat4().makeView(this.light.position, this.light.target, this.light.up)

    // create the light projection matrix
    this.light.projectionMatrix = new Mat4().makeOrthographic(this.light.orthographicCamera)

    // create one uniform buffer that will be used by all the shadow casting meshes
    this.lightProjectionBinding = new BufferBinding({
      label: 'Light',
      name: 'light',
      bindingType: 'uniform',
      struct: {
        viewMatrix: {
          type: 'mat4x4f',
          value: this.light.viewMatrix,
        },
        projectionMatrix: {
          type: 'mat4x4f',
          value: this.light.projectionMatrix,
        },
        position: {
          type: 'vec3f',
          value: this.light.position,
        },
      },
    })
  }

  createShadowMap() {
    // create the depth texture
    this.depthTexture = new Texture(this.renderer, {
      label: 'Shadow map depth texture',
      name: 'shadowMapDepthTexture',
      type: 'depth',
      format: this.depthTextureFormat,
      sampleCount: this.sampleCount,
      fixedSize: {
        width: this.depthTextureSize,
        height: this.depthTextureSize,
      },
    })

    // create the render target
    this.depthPassTarget = new RenderTarget(this.renderer, {
      label: 'Depth pass render target',
      useColorAttachments: false,
      depthTexture: this.depthTexture,
      sampleCount: this.sampleCount,
    })

    // create depth comparison sampler
    // used to compute shadow receiving object visibility
    this.depthComparisonSampler = new Sampler(this.renderer, {
      label: 'Depth comparison sampler',
      name: 'depthComparisonSampler',
      // we do not want to repeat the shadows
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
      compare: 'less',
      type: 'comparison',
    })
  }

  setDepthPass() {
    // add the depth pass (rendered each tick before our main scene)
    this.depthPassTaskID = this.renderer.onBeforeRenderScene.add((commandEncoder) => {
      if (!this.meshes.length) return

      // assign depth material to meshes
      this.meshes.forEach((mesh) => {
        mesh.useMaterial(mesh.userData.depthMaterial)
      })

      // reset renderer current pipeline
      this.renderer.pipelineManager.resetCurrentPipeline()

      // begin depth pass
      const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor)

      // render meshes with their depth material
      this.meshes.forEach((mesh) => {
        if (mesh.ready) mesh.render(depthPass)
      })

      depthPass.end()

      // reset depth meshes material to use the original
      // so the scene renders them normally
      this.meshes.forEach((mesh) => {
        mesh.useMaterial(mesh.userData.originalMaterial)
      })

      // reset renderer current pipeline again
      this.renderer.pipelineManager.resetCurrentPipeline()
    })
  }

  addShadowCastingMesh(mesh, parameters = {}) {
    if (!parameters.shaders) {
      const defaultDepthVs = /* wgsl */ `
        @vertex fn main(
          attributes: Attributes,
        ) -> @builtin(position) vec4f {
          return light.projectionMatrix * light.viewMatrix * matrices.model * vec4(attributes.position, 1.0);
        }
      `

      parameters.shaders = {
        vertex: {
          code: defaultDepthVs,
        },
        fragment: false, // we do not need to output to a fragment shader unless we do late Z writing
      }
    }

    parameters = { ...mesh.material.options.rendering, ...parameters }

    // explicitly set empty output targets
    // we just want to write to the depth texture
    parameters.targets = []

    parameters.sampleCount = this.sampleCount
    parameters.depthFormat = this.depthTextureFormat

    if (parameters.bindings) {
      parameters.bindings = [
        this.lightProjectionBinding,
        mesh.material.getBufferBindingByName('matrices'),
        ...parameters.bindings,
      ]
    } else {
      parameters.bindings = [this.lightProjectionBinding, mesh.material.getBufferBindingByName('matrices')]
    }

    mesh.userData.depthMaterial = new RenderMaterial(this.renderer, {
      label: mesh.options.label + ' Depth render material',
      ...parameters,
    })

    // keep track of original material as well
    mesh.userData.originalMaterial = mesh.material

    this.meshes.push(mesh)
  }

  patchShadowReceivingParameters(params = {}) {
    if (params.textures) {
      params.textures = [...params.textures, this.depthTexture]
    } else {
      params.textures = [this.depthTexture]
    }

    if (params.samplers) {
      params.samplers = [...params.samplers, this.depthComparisonSampler]
    } else {
      params.samplers = [this.depthComparisonSampler]
    }

    if (params.bindings) {
      params.bindings = [...params.bindings, this.lightProjectionBinding]
    } else {
      params.bindings = [this.lightProjectionBinding]
    }

    return params
  }

  destroy() {
    this.renderer.onBeforeRenderScene.remove(this.depthPassTaskID)

    this.meshes.forEach((mesh) => {
      mesh.userData.depthMaterial.destroy()
      mesh.userData.depthMaterial = null
    })

    this.depthPassTarget.destroy()
    this.depthTexture.destroy()
  }
}
