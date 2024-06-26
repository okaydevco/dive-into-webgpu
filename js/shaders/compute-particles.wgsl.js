export const computeParticles = /* wgsl */ `
  
  // https://gist.github.com/munrocket/236ed5ba7e409b8bdf1ff6eca5dcdc39
  // On generating random numbers, with help of y= [(a+x)sin(bx)] mod 1", W.J.J. Rey, 22nd European Meeting of Statisticians 1998
  fn rand11(n: f32) -> f32 { return fract(sin(n) * 43758.5453123); }
  
  fn getInitLife(index: f32) -> f32 {
    return round(rand11(cos(index)) * params.maxLife * 0.95) + params.maxLife * 0.05;
  }
  
  const PI: f32 = 3.14159265359;
  
  // set initial positions and data
  @compute @workgroup_size(256) fn setInitData(
    @builtin(global_invocation_id) GlobalInvocationID: vec3<u32>
  ) {
    let index = GlobalInvocationID.x;
    
    if(index < arrayLength(&particles)) {
      let fIndex: f32 = f32(index);
      
      // calculate a random particle init life, in number of frames
      var initLife: f32 = getInitLife(fIndex);
      
      initParticles[index].position.w = initLife;
      particles[index].position.w = initLife;
      
      // now the positions
      // calculate an initial random position inside a sphere of a defined radius
      var position: vec3f;
      
      // random radius in the [0.5 * params.radius, params.radius] range
      let radius: f32 = (0.5 + rand11(cos(fIndex)) * 0.5) * params.radius;
      let phi: f32 = (rand11(sin(fIndex)) - 0.5) * PI;
      let theta: f32 = rand11(sin(cos(fIndex) * PI)) * PI * 2;

      position.x = radius * cos(theta) * cos(phi);
      position.y = radius * sin(phi);
      position.z = radius * sin(theta) * cos(phi);

      // initial velocity
      var velocity: vec3f = vec3(0.0);
      particles[index].velocity = vec4(velocity, initLife);
            
      // write positions
      particles[index].position.x = position.x;
      particles[index].position.y = position.y;
      particles[index].position.z = position.z;

      initParticles[index].position.x = position.x;
      initParticles[index].position.y = position.y;
      initParticles[index].position.z = position.z;
    }
  }
`
