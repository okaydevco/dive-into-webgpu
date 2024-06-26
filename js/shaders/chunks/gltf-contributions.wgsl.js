export const additionalFragmentHead = /* wgsl */ `
  fn rangeAttenuation(range: f32, distance: f32) -> f32 {
    if (range <= 0.0) {
        // Negative range means no cutoff
        return 1.0 / pow(distance, 2.0);
    }
    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
  }

  // photoshop like blending
  // port of https://gist.github.com/floz/53ad2765cc846187cdd3
  fn rgbToHSL(color: vec3f) -> vec3f {
    var hsl: vec3f;
    
    let fmin: f32 = min(min(color.r, color.g), color.b);    //Min. value of RGB
    let fmax: f32 = max(max(color.r, color.g), color.b);    //Max. value of RGB
    let delta: f32 = fmax - fmin;             //Delta RGB value
  
    hsl.z = (fmax + fmin) / 2.0; // Luminance
  
    //This is a gray, no chroma...
    if (delta == 0.0)	 {
      hsl.x = 0.0;	// Hue
      hsl.y = 0.0;	// Saturation
    }
    else {
      //Chromatic data...
      if (hsl.z < 0.5) {
        hsl.y = delta / (fmax + fmin); // Saturation
      } 
      else {
        hsl.y = delta / (2.0 - fmax - fmin); // Saturation
      }
      
      let deltaR: f32 = (((fmax - color.r) / 6.0) + (delta / 2.0)) / delta;
      let deltaG: f32 = (((fmax - color.g) / 6.0) + (delta / 2.0)) / delta;
      let deltaB: f32 = (((fmax - color.b) / 6.0) + (delta / 2.0)) / delta;
  
      if (color.r == fmax ) {
        hsl.x = deltaB - deltaG; // Hue
      }
      else if (color.g == fmax) {
        hsl.x = (1.0 / 3.0) + deltaR - deltaB; // Hue
      }
      else if (color.b == fmax) {
        hsl.x = (2.0 / 3.0) + deltaG - deltaR; // Hue
      }
        
      if (hsl.x < 0.0) {
        hsl.x += 1.0; // Hue
      }
      else if (hsl.x > 1.0) {
        hsl.x -= 1.0; // Hue
      }
    }
  
    return hsl;
  }
  
  fn hueToRGB(f1: f32, f2: f32, hue: f32) -> f32 {
    var h = hue;
  
    if (h < 0.0) {
      h += 1.0;
    }
    else if (h > 1.0) {
      h -= 1.0;
    }
    
    var res: f32;
    
    if ((6.0 * h) < 1.0) {
      res = f1 + (f2 - f1) * 6.0 * h;
    }
    else if ((2.0 * h) < 1.0) {
      res = f2;
    }
    else if ((3.0 * h) < 2.0) {
      res = f1 + (f2 - f1) * ((2.0 / 3.0) - h) * 6.0;
    }
    else {
      res = f1;
    }
    
    return res;
  }
  
  fn hslToRGB(hsl: vec3f) -> vec3f {
    var rgb: vec3f;
    
    if (hsl.y == 0.0) {
      rgb = vec3(hsl.z); // Luminance
    }
    else {
      var f2: f32;
      
      if (hsl.z < 0.5) {
        f2 = hsl.z * (1.0 + hsl.y);
      }
      else {
        f2 = (hsl.z + hsl.y) - (hsl.y * hsl.z);
      }
        
      let f1: f32 = 2.0 * hsl.z - f2;
      
      rgb.r = hueToRGB(f1, f2, hsl.x + (1.0/3.0));
      rgb.g = hueToRGB(f1, f2, hsl.x);
      rgb.b= hueToRGB(f1, f2, hsl.x - (1.0/3.0));
    }
    
    return rgb;
  }  
  
  // Saturation Blend mode creates the result color by combining the luminance and hue of the base color with the saturation of the blend color.
  fn blendSaturation(base: vec3f, blend: vec3f) -> vec3f {
    let baseHSL: vec3f = rgbToHSL(base);
    return hslToRGB(vec3(baseHSL.r, rgbToHSL(blend).g, baseHSL.b));
  }
  
  // Luminosity Blend mode creates the result color by combining the hue and saturation of the base color with the luminance of the blend color.
  fn blendLuminosity(base: vec3f, blend: vec3f) -> vec3f {
    let baseHSL: vec3f = rgbToHSL(base);
    return hslToRGB(vec3(baseHSL.r, baseHSL.g, rgbToHSL(blend).b));
  }
  
  // use the correct blend equation based on the blendIndex to use
  // and add small adjustments for a more visually pleasing result
  fn getBlendedColor(baseColor: vec4f, blendIndex: i32) -> vec4f {
    var blendedColor: vec4f;
    let blendColor: vec3f = interaction.baseColorFactorsArray[blendIndex];
    
    if(blendIndex == 1) {
      // gold
      blendedColor = vec4(blendLuminosity(blendColor, baseColor.rgb), baseColor.a);
    } else if(blendIndex == 2) {
      // different blending for black card
      blendedColor = vec4(blendColor * blendSaturation(baseColor.rgb, blendColor), baseColor.a);
    } else {
      // default to silver
      blendedColor = vec4(blendLuminosity(blendColor, baseColor.rgb), baseColor.a);
      
      // brighten silver card
      blendedColor = vec4(blendedColor.rgb * vec3(1.25), blendedColor.a);
    }
    
    return blendedColor;
  }
`

export const ambientContribution = /* wgsl */ `
  lightContribution.ambient = ambientLight.intensity * ambientLight.color;
`

export const preliminaryColorContribution = /* wgsl */ `
  // get blended colors
  // based on our currentBaseColorBlendIndex and nextBaseColorBlendIndex uniforms
  let currentColor: vec4f = getBlendedColor(color, interaction.currentBaseColorBlendIndex);
  let nextColor: vec4f = getBlendedColor(color, interaction.nextBaseColorBlendIndex);
  
  var uv: vec2f = fsInput.uv;
  let progress: f32 = interaction.colorChangeProgress;

  // convert to [-1, 1]
  uv = uv * 2.0 - 1.0;

  // apply deformation
  let uvDeformation: f32 = sin(abs(fsInput.uv.y * 2.0) * 3.141592) * 3.0;

  // 0 -> 0.5 -> 0
  let mappedProgress: f32 = 0.5 - (abs(progress * 2.0 - 1.0) * 0.5);

  // apply to X
  uv.x *= 1.0 - mappedProgress * uvDeformation;

  // convert back to [0, 1]
  uv = uv * 0.5 + 0.5;

  // mix between a simple slide change (from https://gl-transitions.com/editor/wipeRight)
  // and our custom animation based on progress
  let p: vec2f = mix(uv, fsInput.uv, smoothstep(0.0, 1.0, progress)) / vec2(1.0);
    
  // add a little white border on the edge of the animation
  // use vec4(3.0) to oversaturate the result
  color = mix(currentColor, vec4(3.0), step(p.x, progress + 0.1 * pow(mappedProgress, 0.5)));
  
  color = mix(color, nextColor, step(p.x, progress));
`

export const lightContribution = /* wgsl */ `
  // here N, V and NdotV are already available
  // they are defined as follows
  // let N: vec3f = normalize(normal);
  // let viewDirection: vec3f = fsInput.viewDirection
  // let V: vec3f: = normalize(viewDirection);
  // let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  let L = normalize(pointLight.position - worldPosition);
  let H = normalize(V + L);

  let NdotL: f32 = clamp(dot(N, L), 0.0, 1.0);
  let NdotH: f32 = clamp(dot(N, H), 0.0, 1.0);
  let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);

  // cook-torrance brdf
  let NDF = DistributionGGX(NdotH, roughness);
  let G = GeometrySmith(NdotL, NdotV, roughness);
  let F = FresnelSchlick(VdotH, f0);

  let kD = (vec3(1.0) - F) * (1.0 - metallic);

  let numerator = NDF * G * F;
  let denominator = max(4.0 * NdotV * NdotL, 0.001);

  let specular = numerator / vec3(denominator);

  let distance = length(pointLight.position - worldPosition);
  let attenuation = rangeAttenuation(pointLight.range, distance);

  let radiance = pointLight.color * pointLight.intensity * attenuation;
  
  lightContribution.diffuse += (kD / vec3(PI)) * radiance * NdotL;
  lightContribution.specular += specular * radiance * NdotL;
`
