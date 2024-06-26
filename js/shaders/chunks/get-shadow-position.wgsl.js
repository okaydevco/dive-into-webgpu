export const getShadowPosition = /* wgsl */ `
  fn getShadowPosition(lightProjectionMatrix: mat4x4f, modelViewPosition: vec4f) -> vec3f {
    // XY is in (-1, 1) space, Z is in (0, 1) space
    let posFromLight = lightProjectionMatrix * modelViewPosition;
  
    // Convert XY to (0, 1)
    // Y is flipped because texture coords are Y-down.
    return vec3(
      posFromLight.xy * vec2(0.5, -0.5) + vec2(0.5),
      posFromLight.z,
    );
  }
`
