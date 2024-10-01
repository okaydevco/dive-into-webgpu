export const planesVs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {
    var vsOutput: VSOutput;
    
    vsOutput.position = getOutputPosition(attributes.position);

    // get correctly scaled UV coordinates
    vsOutput.uv = getUVCover(attributes.uv, planeTextureMatrix);

    return vsOutput;
  }
`

export const planesFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    var color: vec4f = textureSample(planeTexture, defaultSampler, fsInput.uv);

    color.a *= params.opacity;
    return color;
  }
`
