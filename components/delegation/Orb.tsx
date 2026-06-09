'use client'

import { useEffect, useRef } from 'react'

export type OrbState = 'idle' | 'listening' | 'processing' | 'done'

interface OrbProps {
  state: OrbState
}

const VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`

const FRAG = `
precision highp float;
uniform float uTime;
uniform float uActivity;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

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

void main(){
  vec3 viewDir=normalize(vViewPosition);
  float nDotV=max(dot(vNormal,viewDir),0.0);
  float fresnel=pow(1.0-nDotV,2.5);

  float speed=0.35+uActivity*2.2;
  float n1=snoise(vec3(vUv*3.2,uTime*speed*0.5))*0.5+0.5;
  float n2=snoise(vec3(vUv*5.5+0.4,uTime*speed*0.3+10.0))*0.5+0.5;
  float n3=snoise(vec3(vUv*2.0-0.2,uTime*speed*0.7+20.0))*0.5+0.5;

  vec3 cCyan=vec3(0.0,0.898,1.0);
  vec3 cBlue=vec3(0.102,0.42,1.0);
  vec3 cViolet=vec3(0.545,0.361,0.965);
  vec3 cDeep=vec3(0.02,0.06,0.18);

  vec3 col=mix(cDeep,cBlue,n1*0.8);
  col=mix(col,cCyan,n2*0.65);
  col=mix(col,cViolet,n3*0.35);

  float pulse=sin(uTime*(1.4+uActivity*3.0))*0.5+0.5;
  col+=fresnel*cCyan*(0.55+uActivity*0.5+pulse*0.3*uActivity);
  col+=fresnel*fresnel*cBlue*0.4;

  float brightness=0.88+uActivity*0.12+pulse*0.04*uActivity;
  col*=brightness;

  gl_FragColor=vec4(col,0.88+fresnel*0.12);
}
`

const HALO_VERT = `
varying vec3 vNormal;
varying vec3 vViewPosition;
void main(){
  vNormal=normalize(normalMatrix*normal);
  vec4 mvPos=modelViewMatrix*vec4(position,1.0);
  vViewPosition=-mvPos.xyz;
  gl_Position=projectionMatrix*mvPos;
}
`

const HALO_FRAG = `
precision mediump float;
uniform float uTime;
uniform float uActivity;
varying vec3 vNormal;
varying vec3 vViewPosition;
void main(){
  vec3 viewDir=normalize(vViewPosition);
  float fresnel=pow(1.0-max(dot(vNormal,viewDir),0.0),3.0);
  float pulse=sin(uTime*(1.1+uActivity*2.5))*0.5+0.5;
  float a=fresnel*(0.12+uActivity*0.1+pulse*0.05*uActivity);
  vec3 col=mix(vec3(0.102,0.42,1.0),vec3(0.0,0.898,1.0),fresnel);
  gl_FragColor=vec4(col,a);
}
`

export default function Orb({ state }: OrbProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)

  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    if (!mountRef.current) return
    let animId: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: any
    let activityVal = 0

    import('three').then((THREE) => {
      if (!mountRef.current) return

      const W = 320, H = 320
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(W, H)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      mountRef.current.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
      camera.position.z = 3.8

      const uniforms = {
        uTime: { value: 0 },
        uActivity: { value: 0 },
      }

      // Main sphere
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 80, 80),
        new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG,
          uniforms, transparent: true, depthWrite: false,
        })
      )
      scene.add(sphere)

      // Inner halo
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.14, 32, 32),
        new THREE.ShaderMaterial({
          vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
          uniforms, transparent: true, depthWrite: false, side: THREE.BackSide,
        })
      ))

      // Outer halo
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 32, 32),
        new THREE.ShaderMaterial({
          vertexShader: HALO_VERT, fragmentShader: HALO_FRAG,
          uniforms, transparent: true, depthWrite: false, side: THREE.BackSide,
        })
      ))

      // Particles
      const COUNT = 200
      const positions = new Float32Array(COUNT * 3)
      type PData = { theta: number; phi: number; r: number; speed: number }
      const pData: PData[] = []
      for (let i = 0; i < COUNT; i++) {
        const r = 1.52 + Math.random() * 0.48
        const theta = Math.random() * Math.PI * 2
        const phi = (Math.random() - 0.5) * Math.PI
        pData.push({ theta, phi, r, speed: (0.28 + Math.random() * 0.45) * (Math.random() > 0.5 ? 1 : -1) })
        positions[i * 3] = r * Math.cos(theta) * Math.cos(phi)
        positions[i * 3 + 1] = r * Math.sin(phi)
        positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi)
      }
      const pGeo = new THREE.BufferGeometry()
      pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const pMat = new THREE.PointsMaterial({
        color: 0x00e5ff, size: 0.022, transparent: true, opacity: 0.55, depthWrite: false,
      })
      const particles = new THREE.Points(pGeo, pMat)
      scene.add(particles)

      const clock = new THREE.Clock()

      function animate() {
        animId = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()

        const st = stateRef.current
        const target = (st === 'listening' || st === 'processing') ? 1 : 0
        activityVal += (target - activityVal) * 0.035
        uniforms.uTime.value = t
        uniforms.uActivity.value = activityVal

        // Breathing
        const breathRate = 0.7 + activityVal * 1.4
        const breath = 1 + Math.sin(t * breathRate) * (0.022 + activityVal * 0.038)
        sphere.scale.setScalar(breath)

        sphere.rotation.y = t * (0.08 + activityVal * 0.22)
        sphere.rotation.x = Math.sin(t * 0.06) * 0.09

        // Update particles
        const pos = pGeo.attributes.position as THREE.BufferAttribute
        for (let i = 0; i < COUNT; i++) {
          const d = pData[i]
          d.theta += d.speed * 0.0025 * (1 + activityVal * 2.5)
          pos.setXYZ(
            i,
            d.r * Math.cos(d.theta) * Math.cos(d.phi),
            d.r * Math.sin(d.phi),
            d.r * Math.sin(d.theta) * Math.cos(d.phi)
          )
        }
        pos.needsUpdate = true
        pMat.opacity = 0.38 + activityVal * 0.45 + Math.sin(t * 1.8) * 0.08

        renderer.render(scene, camera)
      }
      animate()
    })

    return () => {
      cancelAnimationFrame(animId)
      if (renderer) {
        renderer.dispose()
        if (mountRef.current && renderer.domElement?.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement)
        }
      }
    }
  }, [])

  const isActive = state === 'listening' || state === 'processing'
  const glowOpacity = isActive ? 0.5 : 0.22
  const glowColor = state === 'processing' ? '26, 107, 255' : '0, 229, 255'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
      {/* CSS background bloom */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(${glowColor}, ${glowOpacity}) 0%, transparent 65%)`,
          filter: 'blur(40px)',
          transform: 'scale(1.3)',
          transition: 'all 0.6s ease',
        }}
      />
      {/* Expanding ring when active */}
      {isActive && (
        <>
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ border: '1px solid rgba(0,229,255,0.2)', animation: 'ring-expand 2s ease-out infinite' }} />
          <div className="absolute inset-0 rounded-full pointer-events-none" style={{ border: '1px solid rgba(0,229,255,0.15)', animation: 'ring-expand 2s ease-out 0.7s infinite' }} />
        </>
      )}
      <div ref={mountRef} className="relative z-10" style={{ width: 320, height: 320 }} />
    </div>
  )
}
