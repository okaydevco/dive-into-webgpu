export const galleryShaderPassFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
  };
  
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    var uv: vec2f = fsInput.uv;
    
    // convert to [-1, 1]
    uv = uv * 2.0 - 1.0;
    
    // apply deformation
    let uvDeformation: f32 = cos(abs(uv.y) * 3.141592 * 0.5);
    
    uv.x *= 1.0 + uvDeformation;
    
    // convert back to [0, 1]
    uv = uv * 0.5 + 0.5;

    return textureSample(renderTexture, clampSampler, uv);
  }
`
