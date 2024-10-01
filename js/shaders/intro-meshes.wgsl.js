import { getLambert } from 'gpu-curtains'

export const introMeshVs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) worldPosition: vec3f,
    @location(3) viewDirection: vec3f,
  };
  
  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {
    var vsOutput: VSOutput;
  
    vsOutput.position = getOutputPosition(attributes.position);
    vsOutput.uv = attributes.uv;
    vsOutput.normal = getWorldNormal(attributes.normal);
    vsOutput.worldPosition = getWorldPosition(attributes.position).xyz;
    vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
    
    return vsOutput;
  }
`

export const introMeshFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
    @location(2) worldPosition: vec3f,
    @location(3) viewDirection: vec3f,
  };
  
  ${getLambert()}
  
  // main fragment shader function
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    
    let color: vec3f = getLambert(
      normalize(fsInput.normal),
      fsInput.worldPosition,
      shading.color,
    );
  
    // display our color
    return vec4(color, shading.opacity);
  }
`
