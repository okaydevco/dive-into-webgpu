import { discardParticleFragment } from './chunks/discard-particle-fragment.wgsl'
import { getParticleSize } from './chunks/get-particle-size.wgsl'
import { getShadowPosition } from './chunks/get-shadow-position.wgsl'
import { getPCFSoftShadows } from './chunks/get-pcf-soft-shadows.wgsl'
import { getLambert } from 'gpu-curtains'

export const shadowedParticlesVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) velocity: vec4f,
    @location(3) worldPosition: vec3f,
    @location(4) viewDirection: vec3f,
  };
  
  ${getParticleSize}
  
  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {    
    var vsOutput : VSOutput;
    
    let size: f32 = getParticleSize(attributes.particlePosition.w, attributes.particleVelocity.w);
    
    // billboarding
    let worldPosition: vec4f = matrices.model * vec4(attributes.particlePosition.xyz, 1.0);
    var mvPosition: vec4f = camera.view * worldPosition;
    mvPosition += vec4(attributes.position, 0.0) * size;
    vsOutput.position = camera.projection * mvPosition;
    
    vsOutput.worldPosition = worldPosition.xyz + attributes.position * size;
    vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
    
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
    @location(3) worldPosition: vec3f,
    @location(4) viewDirection: vec3f,
  };
    
  ${getLambert({
    receiveShadows: true,
  })}
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    ${discardParticleFragment}
  
    // clamp velocity
    let velocity = clamp(length(fsInput.velocity.xyz), 0.0, 1.0);
    
    // use it to mix between our 2 colors
    var color: vec3f = mix(shading.darkColor, shading.lightColor, vec3(velocity));
    
    // convert normals from plane to sphere like
    // Convert UV to spherical coordinates
    // https://stackoverflow.com/a/70890424
    var uv: vec2f = fsInput.uv;
    uv = uv * 2.0 - 1.0;
    uv /= vec2(PI, PI * 0.5);
    uv = uv * 0.5 + 0.5;
    
    let theta: f32 = PI * uv.x * 2.0 + PI;
    let phi: f32 = PI * uv.y;

    var sphereNormal: vec3f = vec3();
    sphereNormal.x = sin(theta) * sin(phi);
    sphereNormal.y = cos(phi);
    sphereNormal.z = cos(theta) * sin(phi);
    
    /*color = getLambert(
      normalize(fsInput.normal),
      //normalize(sphereNormal),
      fsInput.worldPosition,
      color,
    );*/
    
    let directionalShadows = getPCFDirectionalShadows(fsInput.worldPosition);
    color *= directionalShadows[0];
  
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

    depthVsOutput.uv = attributes.uv;
    
    // get our directional light & shadow
    let directionalLight: DirectionalLightsElement = directionalLights.elements[0];
    let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[0];
    
    let size: f32 = getParticleSize(attributes.particlePosition.w, attributes.particleVelocity.w);
    
    // billboarding
    let modelPosition: vec4f = matrices.model * vec4(attributes.particlePosition.xyz, 1.0);
    let normal = getWorldNormal(attributes.normal);
    
    // no normal bias
    var mvPosition: vec4f = directionalShadow.viewMatrix * modelPosition;
    mvPosition += vec4(attributes.position, 0.0) * size;
    depthVsOutput.position = directionalShadow.projectionMatrix * mvPosition;
    
    return depthVsOutput;
  }
  
  @fragment fn shadowMapFragment(fsInput: DepthVSOutput) -> @location(0) vec4f {
    ${discardParticleFragment}
    
    // we could return anything here actually
    return vec4f(1.0);
  }
`
