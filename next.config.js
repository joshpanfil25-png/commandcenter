/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three's examples/jsm addons (EffectComposer, UnrealBloomPass) ship as ESM —
  // let Next transpile them so they bundle cleanly.
  transpilePackages: ['three'],
}

module.exports = nextConfig
