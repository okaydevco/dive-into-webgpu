export const introMeshVs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) worldPosition: vec3f,
  };
  
  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {
    var vsOutput: VSOutput;
  
    // position in world space
    let worldPosition: vec4f = matrices.model * vec4(attributes.position, 1.0);
    
    // outputted position
    vsOutput.position = camera.projection * camera.view * worldPosition;
    
    // normals in world space
    vsOutput.normal = getWorldNormal(attributes.normal);
    
    // will be used in our fragment shader to calculate lightning in world space 
    vsOutput.worldPosition = worldPosition.xyz;
    
    return vsOutput;
  }
`

export const introMeshFs = /* wgsl */ `
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) normal: vec3f,
    @location(1) worldPosition: vec3f,
  };
  
  // main fragment shader function
  @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
    // color and opacity from our uniforms
    var color: vec4f = vec4(shading.color, shading.opacity);
    
    // ambient light
    let ambient: vec3f = ambientLight.intensity * ambientLight.color;
    
    // diffuse lambert shading
    let N = normalize(fsInput.normal);
    let L = normalize(directionalLight.position - fsInput.worldPosition);
    let NDotL = max(dot(N, L), 0.0);

    let diffuse: vec3f = NDotL * directionalLight.color * directionalLight.intensity;
    
    color = vec4(
      color.rgb * (diffuse + ambient) * color.a, // apply ambient + diffuse and simulate alpha blending
      color.a
    );
  
    // display our color
    return color;
  }
`
