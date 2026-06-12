'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'

/**
 * Final compositing pass: force transparency by luminance. Any pixel dimmer
 * than `uFloor` becomes fully transparent (alpha 0); pixels brighter than
 * `uCeil` are fully opaque. This GUARANTEES the dark area around the orb is
 * 100% transparent — there is no faint bloom wash that can survive it. Output
 * is premultiplied (rgb*a) to match the renderer's premultipliedAlpha canvas.
 */
const AlphaClipShader = {
  uniforms: {
    tDiffuse: { value: null },
    uFloor: { value: 0.06 },
    uCeil: { value: 0.22 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uFloor;
    uniform float uCeil;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = max(c.r, max(c.g, c.b));
      float a = smoothstep(uFloor, uCeil, lum);
      gl_FragColor = vec4(c.rgb * a, a);
    }
  `,
}

/**
 * Holographic "command orb" — a molten white-hot/mint core inside two geodesic
 * wireframe shells with drifting glowing nodes, all gently rotating, lit by an
 * UnrealBloom pass. `active` (typing/focus) raises the calm baseline; `pulse`
 * (a counter that increments on submit) fires a brief intensity burst.
 *
 * Built on three r0.170 (installed) using the jsm EffectComposer + UnrealBloomPass
 * — same API as r128, identical look, but bundles cleanly in Next.
 */
interface OrbProps {
  active?: boolean
  pulse?: number
}

// ── Shared simplex noise (GLSL) ───────────────────────────────────────────────
const SNOISE = `
vec3 mod289v3(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289v4(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289v4(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289v3(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`

// ── Molten core ───────────────────────────────────────────────────────────────
const CORE_VERT = `
${SNOISE}
uniform float uTime;
uniform float uEnergy;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
float heightField(vec3 dir){
  float t = uTime * (0.20 + uEnergy * 0.30);
  float n = snoise(dir * 1.5 + vec3(0.0, t * 0.6, 0.0));
  n += 0.5 * snoise(dir * 3.0 + vec3(t * 0.5, 0.0, t * 0.4));
  n += 0.25 * snoise(dir * 6.0 - vec3(0.0, t * 0.7, 0.0));
  return n;
}
vec3 displaceDir(vec3 dir){
  float amp = 0.13 + uEnergy * 0.10;
  return dir * (1.0 + heightField(dir) * amp);
}
void main(){
  vec3 dir = normalize(position);
  vec3 dp = displaceDir(dir);
  // perturbed normal via finite differences across the surface
  vec3 ref = abs(dir.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 tang = normalize(cross(dir, ref));
  vec3 bitang = normalize(cross(dir, tang));
  float e = 0.03;
  vec3 dpa = displaceDir(normalize(dir + tang * e));
  vec3 dpb = displaceDir(normalize(dir + bitang * e));
  vec3 nrm = normalize(cross(dpa - dp, dpb - dp));
  if (dot(nrm, dir) < 0.0) nrm = -nrm;
  vNormal = normalize(normalMatrix * nrm);
  vec4 mv = modelViewMatrix * vec4(dp, 1.0);
  vView = -mv.xyz;
  vPos = dp;
  gl_Position = projectionMatrix * mv;
}
`

const CORE_FRAG = `
${SNOISE}
precision highp float;
uniform float uTime;
uniform float uEnergy;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float nDotV = max(dot(N, V), 0.0);
  float fres = pow(1.0 - nDotV, 2.4);

  // churning plasma veins
  float flow  = snoise(vPos * 2.4 + vec3(0.0, uTime * 0.30, 0.0)) * 0.5 + 0.5;
  float flow2 = snoise(vPos * 4.6 - vec3(uTime * 0.22, 0.0, 0.0)) * 0.5 + 0.5;

  vec3 white = vec3(1.0, 1.0, 0.97);
  vec3 mint  = vec3(0.36, 1.0, 0.74);
  vec3 deep  = vec3(0.02, 0.42, 0.30);

  vec3 col = mix(deep, mint, smoothstep(0.12, 0.95, flow));
  col = mix(col, mint, flow2 * 0.4);

  // soft glowing heart — gentle, NOT a blinding sun. White is restrained and
  // only the very center hints at white-hot; the mint glow dominates.
  float core = smoothstep(0.55, 0.99, nDotV);
  core = pow(core, 2.2) * (0.35 + 0.4 * flow);
  col = mix(col, white, core * 0.45);
  col += white * core * (0.10 + uEnergy * 0.30);

  // mint rim bleed
  col += mint * fres * (0.22 + uEnergy * 0.35);

  // keep it dim — low HDR so bloom stays soft and the lattice reads over it
  col *= 0.62 + uEnergy * 0.35 + flow * 0.12;
  gl_FragColor = vec4(col, 1.0);
}
`

// ── Wispy plasma shell ────────────────────────────────────────────────────────
const SHELL_VERT = `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
void main(){
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = -mv.xyz;
  vPos = position;
  gl_Position = projectionMatrix * mv;
}
`

const SHELL_FRAG = `
${SNOISE}
precision mediump float;
uniform float uTime;
uniform float uEnergy;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vPos;
void main(){
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vView);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  float smoke = snoise(vPos * 2.0 + vec3(0.0, uTime * 0.20, 0.0)) * 0.5 + 0.5;
  smoke *= snoise(vPos * 3.6 - vec3(uTime * 0.15)) * 0.5 + 0.5;
  float a = fres * (0.10 + smoke * 0.16 + uEnergy * 0.12);
  vec3 col = mix(vec3(0.10, 0.70, 0.55), vec3(0.55, 1.0, 0.82), fres);
  gl_FragColor = vec4(col * (0.7 + uEnergy * 0.5), a);
}
`

// ── Glowing nodes ─────────────────────────────────────────────────────────────
const NODE_VERT = `
uniform float uEnergy;
uniform float uSize;
attribute float aScale;
varying float vGlow;
void main(){
  vGlow = aScale;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * aScale * (1.0 + uEnergy * 0.6) * (300.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`

const NODE_FRAG = `
precision mediump float;
uniform float uEnergy;
varying float vGlow;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = pow(smoothstep(0.5, 0.0, d), 1.8);
  vec3 col = mix(vec3(0.5, 1.0, 0.85), vec3(0.85, 1.0, 1.0), vGlow);
  gl_FragColor = vec4(col, a * (0.5 + 0.5 * vGlow) * (0.7 + uEnergy * 0.5));
}
`

export default function Orb({ active = false, pulse = 0 }: OrbProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(active)
  const pulseEnergyRef = useRef(0)
  const lastPulseRef = useRef(pulse)

  // Sync reactive props into refs the animation loop reads.
  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => {
    if (pulse !== lastPulseRef.current) {
      lastPulseRef.current = pulse
      pulseEnergyRef.current = 1.25 // spike; decays each frame
    }
  }, [pulse])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let width = mount.clientWidth || 480
    let height = mount.clientHeight || 480

    // Transparent renderer — the orb floats on the page's own near-black bg,
    // no visible canvas square, no panel behind it.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.background = 'transparent'
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = null // no opaque scene backdrop — page bg shows through
    scene.fog = null        // no fog halo that could fill the canvas rect
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100)
    camera.position.set(0, 0, 8.2) // pulled back → smaller, contained assembly with breathing room

    const uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: 0 },
    }

    const root = new THREE.Group()
    root.scale.setScalar(0.82)
    root.rotation.x = 0.16 // fixed gentle tilt for depth — no animated wobble
    scene.add(root)

    // — Molten core (uniform icosphere, GPU-displaced) —
    const coreMat = new THREE.ShaderMaterial({
      vertexShader: CORE_VERT,
      fragmentShader: CORE_FRAG,
      uniforms,
    })
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 5), coreMat)
    root.add(core)

    // — Wispy plasma shell —
    const shellMat = new THREE.ShaderMaterial({
      vertexShader: SHELL_VERT,
      fragmentShader: SHELL_FRAG,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    })
    const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 4), shellMat)
    root.add(shell)

    // — Inner geodesic wireframe (the hero structural element) —
    const innerWireMat = new THREE.LineBasicMaterial({
      color: 0xbfffe8,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const innerWire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.55, 2)),
      innerWireMat,
    )
    root.add(innerWire)

    // — Outer, larger + looser wireframe (jittered for irregularity) —
    const outerBase = new THREE.IcosahedronGeometry(2.05, 1)
    const op = outerBase.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < op.count; i++) {
      op.setXYZ(
        i,
        op.getX(i) + (rand(i * 3 + 1) - 0.5) * 0.16,
        op.getY(i) + (rand(i * 3 + 2) - 0.5) * 0.16,
        op.getZ(i) + (rand(i * 3 + 3) - 0.5) * 0.16,
      )
    }
    const outerWireMat = new THREE.LineBasicMaterial({
      color: 0x4fe0ff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const outerWire = new THREE.LineSegments(new THREE.WireframeGeometry(outerBase), outerWireMat)
    const outerGroup = new THREE.Group()
    outerGroup.add(outerWire)
    root.add(outerGroup)

    // — Free-floating glowing nodes + faint connecting lines —
    const NODE_COUNT = 110
    const nodePos = new Float32Array(NODE_COUNT * 3)
    const nodeScale = new Float32Array(NODE_COUNT)
    for (let i = 0; i < NODE_COUNT; i++) {
      const r = 1.7 + rand(i * 7 + 1) * 0.95
      const theta = rand(i * 7 + 2) * Math.PI * 2
      const phi = Math.acos(2 * rand(i * 7 + 3) - 1)
      nodePos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      nodePos[i * 3 + 1] = r * Math.cos(phi)
      nodePos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      nodeScale[i] = 0.4 + rand(i * 7 + 4) * 0.6
    }
    const nodeGeo = new THREE.BufferGeometry()
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodePos, 3))
    nodeGeo.setAttribute('aScale', new THREE.BufferAttribute(nodeScale, 1))
    const nodeMat = new THREE.ShaderMaterial({
      vertexShader: NODE_VERT,
      fragmentShader: NODE_FRAG,
      uniforms: { ...uniforms, uSize: { value: 16 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const nodes = new THREE.Points(nodeGeo, nodeMat)

    // connect near pairs with faint lines (capped)
    const linePts: number[] = []
    const MAX_LINES = 70
    for (let i = 0; i < NODE_COUNT && linePts.length < MAX_LINES * 6; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const dx = nodePos[i * 3] - nodePos[j * 3]
        const dy = nodePos[i * 3 + 1] - nodePos[j * 3 + 1]
        const dz = nodePos[i * 3 + 2] - nodePos[j * 3 + 2]
        if (dx * dx + dy * dy + dz * dz < 0.55 * 0.55) {
          linePts.push(
            nodePos[i * 3], nodePos[i * 3 + 1], nodePos[i * 3 + 2],
            nodePos[j * 3], nodePos[j * 3 + 1], nodePos[j * 3 + 2],
          )
          if (linePts.length >= MAX_LINES * 6) break
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(linePts), 3))
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x5fe6ff,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const nodeLines = new THREE.LineSegments(lineGeo, lineMat)
    const nodeGroup = new THREE.Group()
    nodeGroup.add(nodes)
    nodeGroup.add(nodeLines)
    root.add(nodeGroup)

    // — Bloom post-processing (what sells the glow) —
    const composer = new EffectComposer(renderer)
    // Force the base render to clear to fully transparent (0,0,0,0) every frame
    // so dark areas of the canvas stay 100% transparent.
    const renderPass = new RenderPass(scene, camera, undefined, new THREE.Color(0x000000), 0)
    composer.addPass(renderPass)
    // Tight radius + high threshold: the glow hugs the bright orb pixels and
    // decays to zero well within the canvas, so no faint wash reaches the edges.
    const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.32, 0.12, 0.62)
    composer.addPass(bloom)
    // OutputPass for color management (writes to buffer, not screen).
    composer.addPass(new OutputPass())
    // Final pass forces dark areas to alpha 0 — kills any bloom wash rectangle.
    composer.addPass(new ShaderPass(AlphaClipShader))
    composer.setSize(width, height)

    // — Animation —
    const clock = new THREE.Clock()
    let shaderTime = 0
    let easedEnergy = 0
    let raf = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)

      // energy: calm baseline (active) + decaying pulse spike
      const baseTarget = activeRef.current ? 0.5 : 0.0
      easedEnergy += (baseTarget - easedEnergy) * 0.045
      pulseEnergyRef.current *= 0.94
      const E = Math.min(1.6, easedEnergy + pulseEnergyRef.current)
      uniforms.uEnergy.value = E

      // churn advances faster with energy
      shaderTime += dt * (1 + E * 0.8)
      uniforms.uTime.value = shaderTime

      // slow, hypnotic, EVEN rotation (~one turn / 54s) about a fixed tilted axis.
      // Layers spin at slightly different rates for parallax — no sine wobble.
      const spin = (1 + E * 0.35) * dt
      root.rotation.y += 0.116 * spin
      outerGroup.rotation.y -= 0.045 * spin
      outerGroup.rotation.z += 0.015 * spin
      nodeGroup.rotation.y += 0.03 * spin

      // lattice + bloom breathe a touch brighter with energy
      innerWireMat.opacity = 0.58 + E * 0.22
      outerWireMat.opacity = 0.22 + E * 0.12
      bloom.strength = 0.3 + E * 0.3

      composer.render()
    }
    animate()

    // — Responsive sizing —
    const resize = () => {
      width = mount.clientWidth || width
      height = mount.clientHeight || height
      renderer.setSize(width, height)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      composer.setSize(width, height)
      bloom.setSize(width, height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    // — Cleanup —
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      composer.dispose()
      renderer.dispose()
      coreMat.dispose(); shellMat.dispose(); innerWireMat.dispose()
      outerWireMat.dispose(); nodeMat.dispose(); lineMat.dispose()
      core.geometry.dispose(); shell.geometry.dispose()
      innerWire.geometry.dispose(); outerWire.geometry.dispose()
      nodeGeo.dispose(); lineGeo.dispose(); outerBase.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="w-full h-full" />
}

// Deterministic pseudo-random (stable layout across reloads, no Math.random churn).
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
