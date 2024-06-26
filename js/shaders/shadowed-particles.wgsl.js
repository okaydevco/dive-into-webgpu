export const shadowedParticlesVs = /* wgsl */ `  
  struct VSOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
  };
  
  // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
  // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
  fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }

  @vertex fn main(
    attributes: Attributes,
  ) -> VSOutput {    
    var vsOutput : VSOutput;
    
    let instanceIndex: f32 = f32(attributes.instanceIndex);
    const PI: f32 = 3.14159265359;
    
    var position: vec3f;
    
    // random radius in the [0, params.radius] range
    let radius: f32 = rand11(cos(instanceIndex)) * params.radius;
    
    let phi: f32 = (rand11(sin(instanceIndex)) - 0.5) * PI;
    
    let theta: f32 = rand11(sin(cos(instanceIndex) * PI)) * PI * 2;

    position.x = radius * cos(theta) * cos(phi);
    position.y = radius * sin(phi);
    position.z = radius * sin(theta) * cos(phi);
    
    // billboarding
    var mvPosition: vec4f = matrices.modelView * vec4(position, 1.0);
    mvPosition += vec4(attributes.position, 0.0);
    vsOutput.position = camera.projection * mvPosition;
    
    vsOutput.uv = attributes.uv;
    
    // normals in view space to follow billboarding
    vsOutput.normal = getViewNormal(attributes.normal);
    
    return vsOutput;
  }
`
