export const additionalFragmentHead = /* wgsl */ `
  fn rangeAttenuation(range: f32, distance: f32) -> f32 {
    if (range <= 0.0) {
        // Negative range means no cutoff
        return 1.0 / pow(distance, 2.0);
    }
    return clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0) / pow(distance, 2.0);
  }
`

export const ambientContribution = /* wgsl */ `
  lightContribution.ambient = ambientLight.intensity * ambientLight.color;
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
