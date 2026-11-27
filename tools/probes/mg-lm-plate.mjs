// tools/probes/mg-lm-plate.mjs — decode a committed ktx2 lightmap through the app's own
// KTX2Loader path and shoot the atlas as PNG (a local instrument; never run by CI).
//
//   node tools/probes/mg-lm-plate.mjs <url-of-ktx2> [out.png] [url-base]
// e.g. node tools/probes/mg-lm-plate.mjs http://localhost:5199/assets/military-gallery/lm/day.ktx2

import { chromium } from '@playwright/test';

const [url, out = '/tmp/mg-lm-plate.png', base = 'http://localhost:5199'] = process.argv.slice(2);
if (!url) {
  console.error('usage: node tools/probes/mg-lm-plate.mjs <ktx2-url> [out] [base]');
  process.exit(2);
}

const main = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2100, height: 1100 } });
  await page.goto(`${base}/`); // the transcoder path resolves against the app's origin
  const dataUrl = await page.evaluate(
    async ({ ktxUrl }) => {
      const THREE = await import('/src/../../node_modules/three/build/three.module.js').catch(
        () => null,
      );
      const mod = await import('/src/main.ts').catch(() => null); // warm nothing; unused
      if (mod === null || THREE === null) return { error: 'import failed' };
      const { KTX2Loader } = await import('/node_modules/three/examples/jsm/loaders/KTX2Loader.js');
      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(2048, 2048);
      document.body.style.margin = '0';
      document.body.appendChild(renderer.domElement);
      const loader = new KTX2Loader()
        .setTranscoderPath('/basis/')
        .setWorkerLimit(1)
        .detectSupport(renderer);
      const texture = await new Promise((resolve, reject) => {
        loader.load(ktxUrl, resolve, undefined, reject);
      });
      const tex = texture;
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
      const material = new THREE.MeshBasicMaterial({ map: tex });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
      scene.add(quad);
      renderer.render(scene, camera);
      const info = {
        width: tex.image?.width,
        height: tex.image?.height,
        mipmaps: tex.mipmaps?.length ?? 0,
        minFilter: tex.minFilter,
        magFilter: tex.magFilter,
        format: tex.format,
        type: tex.type,
        colorSpace: tex.colorSpace,
      };
      return { dataUrl: renderer.domElement.toDataURL('image/png'), info };
    },
    { ktxUrl: url },
  );
  if (dataUrl.error !== undefined) {
    console.error(dataUrl.error);
    await browser.close();
    process.exit(1);
  }
  const png = Buffer.from(dataUrl.dataUrl.split(',')[1], 'base64');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(out, png);
  console.log(out, JSON.stringify(dataUrl.info));
  await browser.close();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
