export const shadowedParticlesVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
  };

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {    
    var vsOutput : VSOutput;
    
    // billboarding
    var mvPosition: vec4f = matrices.modelView * vec4(attributes.particlePosition.xyz, 1.0);
    mvPosition += vec4(attributes.position, 0.0);
    vsOutput.position = camera.projection * mvPosition;
    
    vsOutput.uv = attributes.uv;
    
    // normals in view space to follow billboarding
    vsOutput.normal = getViewNormal(attributes.normal);
    
    return vsOutput;
  }
`
