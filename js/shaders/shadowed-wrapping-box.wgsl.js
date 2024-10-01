import { getLambert } from 'gpu-curtains'

export const wrappingBoxFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @builtin(front_facing) frontFacing: bool,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) worldPosition: vec3f,
    @location(3) viewDirection: vec3f,
  };
    
  ${getLambert({
    receiveShadows: true,
  })}
  
  fn applyDithering(color: vec3f, fragCoord: vec2f) -> vec3f {
    // Simple random noise based on fragment coordinates
    let scale = 1.0 / 255.0; // Adjust this value to control the strength of the dithering
    let noise = fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453);

    // Apply the noise to the color
    return color + vec3(noise * scale);
  }
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {    
    // inverse the normals if we're using front face culling
    let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
    
    var color = getLambert(
      normalize(fsInput.normal * faceDirection),
      fsInput.worldPosition,
      shading.color,
    );
    
    // apply dithering to reduce color banding
    color = applyDithering(color, fsInput.position.xy);

    return vec4(color, 1.0);
  }
`
