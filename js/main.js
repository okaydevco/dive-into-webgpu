// Dynamically import Demo depending on WebGPU support
async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    console.error("WebGPU is not supported in this browser.");
    const disclaimer = document.createElement('div');
    disclaimer.setAttribute('id', 'no-webgpu-disclaimer');
    disclaimer.classList.add('tiny');
    disclaimer.innerHTML = 'Unfortunately, it looks like WebGPU is not (yet) supported by your browser or OS. For more information, visit <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility" target="_blank" rel="noopener">mdn web docs</a>.';
    document.body.appendChild(disclaimer);
    document.body.classList.add('no-webgpu');

    return false; // No WebGPU support
  }

  return true; // WebGPU is supported
}

(async () => {
  const isWebGPUSupported = await checkWebGPUSupport();

  if (isWebGPUSupported) {
    import('./Demo')
      .then((module) => {
        const Demo = module.default || module.Demo;

        if (document.readyState === 'complete') {
          const demo = new Demo();
        } else {
          window.addEventListener('load', () => {
            const demo = new Demo();
          });
        }
      })
      .catch(err => {
        console.error("Failed to load WebGPU-dependent module:", err);
      });
  }
})();
