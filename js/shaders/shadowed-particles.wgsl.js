import { discardParticleFragment } from './chunks/discard-particle-fragment.wgsl'
import { getParticleSize } from './chunks/get-particle-size.wgsl'

export const shadowedParticlesVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) velocity: vec4f,
  };
  
  ${getParticleSize}

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
    
    return vsOutput;
  }
`

export const shadowedParticlesFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) velocity: vec4f,
  };
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    ${discardParticleFragment}
  
    // clamp velocity
    let velocity = clamp(length(fsInput.velocity.xyz), 0.0, 1.0);
    
    // use it to mix between our 2 colors
    var color: vec3f = mix(shading.darkColor, shading.lightColor, vec3(velocity));
  
    return vec4(color, 1.0);  
  }
`
