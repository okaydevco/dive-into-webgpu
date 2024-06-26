import { getShadowPosition } from './chunks/get-shadow-position.wgsl'
import { getPCFSoftShadows } from './chunks/get-pcf-soft-shadows.wgsl'

export const wrappingBoxVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) shadowPosition: vec3f,
    @location(3) worldPosition: vec3f,
  };
  
  ${getShadowPosition}

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {    
    var vsOutput : VSOutput;
    
    let worldPosition: vec4f = matrices.model * vec4(attributes.position, 1.0);
    vsOutput.position = camera.projection * camera.view * worldPosition;
    
    vsOutput.uv = attributes.uv;
    
    vsOutput.normal = getWorldNormal(attributes.normal);
    
    vsOutput.shadowPosition = getShadowPosition(
      light.projectionMatrix,
      light.viewMatrix * matrices.model * vec4(attributes.position, 1.0)
    );
    
    vsOutput.worldPosition = worldPosition.xyz;
    
    return vsOutput;
  }
`

export const wrappingBoxFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @builtin(front_facing) frontFacing: bool,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) shadowPosition: vec3f,
    @location(3) worldPosition: vec3f,
  };
  
  ${getPCFSoftShadows}
  
  fn applyDithering(color: vec3f, fragCoord: vec2f) -> vec3f {
    // Simple random noise based on fragment coordinates
    let scale = 1.0 / 255.0; // Adjust this value to control the strength of the dithering
    let noise = fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453);

    // Apply the noise to the color
    return color + vec3(noise * scale);
  }
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    var visibility = getPCFSoftShadows(fsInput.shadowPosition);

    visibility = clamp(visibility, 1.0 - clamp(shading.shadowIntensity, 0.0, 1.0), 1.0);
    
    // ambient light
    let ambient: vec3f = ambientLight.intensity * ambientLight.color;
    
    // inverse the normals if we're using front face culling
    let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
    
    // diffuse lambert shading
    let N = normalize(faceDirection * fsInput.normal);
    let L = normalize(light.position - fsInput.worldPosition);
    let NDotL = max(dot(N, L), 0.0);

    let diffuse: vec3f = NDotL * directionalLight.color * directionalLight.intensity;
    
    // apply shadow to diffuse
    let lightAndShadow: vec3f = ambient + visibility * diffuse;
    
    // apply dithering to reduce color banding
    let color = applyDithering(shading.color * lightAndShadow, fsInput.position.xy);

    return vec4(color, 1.0);
  }
`
