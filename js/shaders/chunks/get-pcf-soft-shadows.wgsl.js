export const getPCFSoftShadows = /* wgsl */ `
  fn getPCFSoftShadows(shadowPosition: vec3f) -> f32 {
    // Percentage-closer filtering. Sample texels in the region
    // to smooth the result.
    var visibility: f32 = 0.0;
    let bias: f32 = 0.001; 
    
    let size: f32 = f32(textureDimensions(shadowMapDepthTexture).y);
    
    let oneOverShadowDepthTextureSize = 1.0 / size;
    for (var y = -1; y <= 1; y++) {
      for (var x = -1; x <= 1; x++) {
        let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;
  
        visibility += textureSampleCompare(
          shadowMapDepthTexture,
          depthComparisonSampler,
          shadowPosition.xy + offset,
          shadowPosition.z - bias
        );
      }
    }
    
    visibility /= 9.0;
    
    return visibility;
  }
`
