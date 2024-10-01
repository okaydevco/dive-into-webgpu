import { discardParticleFragment } from './chunks/discard-particle-fragment.wgsl'
import { getParticleSize } from './chunks/get-particle-size.wgsl'
import { getShadowPosition } from './chunks/get-shadow-position.wgsl'
import { getPCFSoftShadows } from './chunks/get-pcf-soft-shadows.wgsl'

export const shadowedParticlesVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) velocity: vec4f,
    @location(3) shadowPosition: vec3f,
  };
  
  ${getParticleSize}
  
  ${getShadowPosition}

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {    
    var vsOutput : VSOutput;
    
    let size: f32 = getParticleSize(attributes.particlePosition.w, attributes.particleVelocity.w);
    
    // billboarding
    var mvPosition: vec4f = matrices.modelView * vec4(attributes.particlePosition.xyz, 1.0);
    mvPosition += vec4(attributes.position, 0.0) * size;
    vsOutput.position = camera.projection * mvPosition;
    
    vsOutput.uv = attributes.uv;
    
    // normals in view space to follow billboarding
    vsOutput.normal = getViewNormal(attributes.normal);
    
    vsOutput.velocity = attributes.particleVelocity;
    
    // the shadow position must account for billboarding as well!
    var mvShadowPosition: vec4f = light.viewMatrix * matrices.model * vec4(attributes.particlePosition.xyz, 1.0);
    mvShadowPosition += vec4(attributes.position, 0.0) * size;
    
    vsOutput.shadowPosition = getShadowPosition(
      light.projectionMatrix,
      mvShadowPosition
    );
    
    return vsOutput;
  }
`

export const shadowedParticlesFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) velocity: vec4f,
    @location(3) shadowPosition: vec3f,
  };
  
  ${getPCFSoftShadows}
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    ${discardParticleFragment}
  
    // clamp velocity
    let velocity = clamp(length(fsInput.velocity.xyz), 0.0, 1.0);
    
    // use it to mix between our 2 colors
    var color: vec3f = mix(shading.darkColor, shading.lightColor, vec3(velocity));
    
    var visibility = getPCFSoftShadows(fsInput.shadowPosition);
    visibility = clamp(visibility, 1.0 - clamp(shading.shadowIntensity, 0.0, 1.0), 1.0);
    
    color *= visibility;
  
    return vec4(color, 1.0);  
  }
`

export const particlesDepthPassShaders = /* wgsl */ `
  struct DepthVSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };
  
  ${getParticleSize}
  
  @vertex fn shadowMapVertex(
    attributes: Attributes,
  ) -> DepthVSOutput {
    var depthVsOutput: DepthVSOutput;
    
    let size: f32 = getParticleSize(attributes.particlePosition.w, attributes.particleVelocity.w);
    
    // billboarding
    var mvPosition: vec4f = light.viewMatrix * matrices.model * vec4(attributes.particlePosition.xyz, 1.0);
    mvPosition += vec4(attributes.position, 0.0) * size;
    depthVsOutput.position = light.projectionMatrix * mvPosition;
    
    depthVsOutput.uv = attributes.uv;
    
    return depthVsOutput;
  }
  
  @fragment fn shadowMapFragment(fsInput: DepthVSOutput) -> @location(0) vec4f {
    ${discardParticleFragment}
    
    // we could return anything here actually
    return vec4f(1.0);
  }
`