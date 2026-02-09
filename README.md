# Dive into WebGPU with gpu-curtains

![Dive into WebGPU image](https://images.okaydev.co/production/images/articles/dive-into-webgpu/part-1/dive-into-webgpu.png?w=1200&h=630&q=82&auto=format&fit=min&dm=1734234711&s=371253a9f9c3c96e549c7eab34b9a063)

### About the Tutorial

We are going to build a landing page containing 4 independent WebGPU scenes. Each scene will have its own HTML Canvas Element that we will use for rendering our objects.

Here is a brief overview of the various scenes and what you’ll learn:

- Draw multiple meshes, position them so they always fit in the viewport, and add a basic Lambert shader.
- Create a DOM-synced planes gallery and add a post-processing pass to distort them on scroll.
- Load a glTF object, sync its size and position with an HTML element, add the ability to rotate it on drag, and change its base color when clicking on a set of buttons.
- Create a particle system using instanced billboarded quads, use compute shaders to set and update the particles’ positions and velocities, and finally add shadows.

[Read the article on Okay Dev](https://okaydev.co/articles/dive-into-webgpu-part-1)

## Demo

[Dive into WebGPU](https://okaydev.co/dist/tutorials/dive-into-webgpu/index.html)

## Installation

- Install with `npm run install`
- Run the demo with `npm run dev`
- Build it with `npm run build`

## Credits

- Demo and tutorials by [Martin Laxenaire](https://okaydev.co/u/martinlaxenaire)
- Edited and published by [Eric Van Holtz](https://okaydev.co/u/eric) of [Okay Dev](https://okaydev.co)
- Metal Credit Card model from [Sketchfab](https://sketchfab.com/3d-models/metal-credit-card-b6cff2460421408f84c9af7a85ce906e) by [Maxitaxx](https://sketchfab.com/maxitaxx)

## License

MIT License

Copyright (c) 2024 Martin Laxenaire

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
