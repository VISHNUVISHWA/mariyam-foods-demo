/* Mariyam Foods: the keepsake tin is the only 3D object left. It powers the tin thumbnails and the 360 viewer on the Festival Tin page. Snacks use static photography. */
(function () {
  const T = window.THREE;
  let glOK = false;
  try {
    const c = document.createElement("canvas");
    glOK = !!(T && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { glOK = false; }

  const API = { ok: glOK };
  window.MF3D = API;
  if (!glOK) return;

  const C = (hex) => new T.Color(hex).convertSRGBToLinear();

  /* ---------- model ---------- */
  const MODELS = {
    tin() {
      const G = new T.Group();
      const body = new T.CylinderGeometry(.74, .74, 1.08, 96, 1, true);
      const metal = (hex, o) => { const m = new T.Mesh(body, new T.MeshStandardMaterial(Object.assign({ color: C(hex), metalness: .9, roughness: .34 }, o))); m.castShadow = m.receiveShadow = true; return m; };
      G.add(metal("#1a7a34", { metalness: .55, roughness: .38 }));
      const lidG = new T.CylinderGeometry(.775, .775, .24, 96);
      const gold = { color: C("#e0a436"), metalness: 1, roughness: .26 };
      const lid = new T.Mesh(lidG, new T.MeshStandardMaterial(gold)); lid.position.y = .66; lid.castShadow = true; G.add(lid);
      [[-.54, .778], [.54, .752], [-.4, .744], [.78, .778]].forEach((a) => {
        const r = new T.Mesh(new T.TorusGeometry(a[1], .018, 12, 96), new T.MeshStandardMaterial(gold));
        r.rotation.x = Math.PI / 2; r.position.y = a[0]; G.add(r);
      });
      const base = new T.Mesh(new T.CylinderGeometry(.74, .74, .02, 64), new T.MeshStandardMaterial(gold)); base.position.y = -.54; G.add(base);
      const tex = API._emblemTex;
      if (tex) {
        const lab = new T.Mesh(
          new T.CylinderGeometry(.752, .752, .96, 48, 1, true, -.72, 1.44),
          new T.MeshStandardMaterial({ map: tex, transparent: true, roughness: .4, side: T.DoubleSide })
        );
        lab.position.y = .0;
        G.add(lab);
      }
      G.rotation.set(.22, 0, 0);
      return G;
    }
  };


  /* ---------- lighting rig ---------- */
  function rig(renderer, scene) {
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .82;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    const env = new T.Scene();
    env.add(new T.Mesh(new T.SphereGeometry(20, 16, 12), new T.MeshBasicMaterial({ color: new T.Color(.05, .085, .06), side: T.BackSide })));
    const panel = (x, y, z, w, h, r, g, b) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(r, g, b), side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(4, 7, 5, 8, 5, 3.4, 2.7, 1.7);
    panel(-8, 2, 2, 3, 8, 1.5, .95, .35);
    panel(5, -4, -7, 7, 3, 1.3, .7, .22);
    panel(0, -8, 4, 8, 3, .4, .7, .4);
    const pm = new T.PMREMGenerator(renderer);
    const rt = pm.fromScene(env, .04);
    scene.environment = rt.texture;
    pm.dispose();
    const key = new T.DirectionalLight(0xffe6bf, 1.7);
    key.position.set(2.4, 4.2, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -.0006; key.shadow.normalBias = .012;
    const s = key.shadow.camera; s.left = s.bottom = -2; s.right = s.top = 2; s.far = 12;
    const rim = new T.DirectionalLight(0xffa030, 1.1); rim.position.set(-3.4, 1.2, -2.6);
    scene.add(key, rim, new T.HemisphereLight(0xfff4dd, 0x22351f, .25));
    return rt;
  }
  function frame(camera, group, pad) {
    const box = new T.Box3().setFromObject(group), sph = box.getBoundingSphere(new T.Sphere());
    if (group.userData.radius) { sph.radius = group.userData.radius; sph.center.set(0, 0, 0); }
    group.position.sub(sph.center);
    const d = sph.radius * (pad || 1.1) / Math.sin(camera.fov * Math.PI / 360);
    camera.position.set(0, 0, d);
    camera.near = d * .1; camera.far = d * 4; camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
  }
  function disposeTree(o) {
    o.traverse((n) => { if (n.geometry) n.geometry.dispose(); if (n.material) n.material.dispose(); });
  }

  /* ---------- emblem texture for the tin ---------- */
  const emblemReady = new Promise((res) => {
    if (!window.MF_EMBLEM) return res();
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 1024; c.height = 768;
      const x = c.getContext("2d"), h = 720, w = h * img.width / img.height;
      x.drawImage(img, (1024 - w) / 2, 24, w, h);
      const tex = new T.CanvasTexture(c); tex.encoding = T.sRGBEncoding; tex.anisotropy = 4;
      API._emblemTex = tex; res();
    };
    img.onerror = () => res();
    img.src = window.MF_EMBLEM;
  });

  /* ---------- thumbnails ---------- */
  function cropped(src) {
    const a = document.createElement("canvas"); a.width = src.width; a.height = src.height;
    const x = a.getContext("2d", { willReadFrequently: true }); x.drawImage(src, 0, 0);
    const d = x.getImageData(0, 0, a.width, a.height).data;
    let l = a.width, r = 0, t = a.height, b = 0;
    for (let py = 0; py < a.height; py += 2) for (let px = 0; px < a.width; px += 2) {
      if (d[(py * a.width + px) * 4 + 3] > 16) { if (px < l) l = px; if (px > r) r = px; if (py < t) t = py; if (py > b) b = py; }
    }
    if (r <= l) return src.toDataURL("image/webp", .9);
    const size = Math.ceil(Math.max(r - l, b - t) * 1.05), out = document.createElement("canvas");
    out.width = out.height = 720;
    const k = 720 / size, c = out.getContext("2d");
    c.imageSmoothingQuality = "high";
    c.drawImage(a, 360 - (l + r) / 2 * k, 360 - (t + b) / 2 * k, a.width * k, a.height * k);
    return out.toDataURL("image/webp", .9);
  }
  const cache = {};
  let thumbR = null, thumbS = null, thumbCam = null, chain = Promise.resolve();
  API.thumb = function (id) {
    if (cache[id]) return cache[id];
    cache[id] = chain = chain.then(() => emblemReady).then(() => new Promise((resolve) => {
      setTimeout(() => {
        try {
          if (!thumbR) {
            thumbR = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
            thumbR.setSize(1024, 1024, false);
            thumbS = new T.Scene(); thumbCam = new T.PerspectiveCamera(26, 1, .1, 100);
            rig(thumbR, thumbS);
          }
          const g = MODELS[id]();
          thumbS.add(g); frame(thumbCam, g, 1.04);
          thumbR.render(thumbS, thumbCam);
          const url = cropped(thumbR.domElement);
          thumbS.remove(g); disposeTree(g);
          resolve(url);
        } catch (e) { console.warn("thumb failed", id, e); resolve(null); }
      }, 0);
    }));
    return cache[id];
  };

  /* ---------- adaptive quality ---------- */
  function tuner(renderer, scene, name) {
    const gl = renderer.getContext(), px = new Uint8Array(4);
    let n = 0, best = 1e9, done = false;
    return (draw) => {
      n++;
      if (done || n < 4) return draw();
      const t = performance.now();
      draw();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      best = Math.min(best, performance.now() - t);
      if (n >= 8) {
        done = true;
        API.frameMs = API.frameMs || {};
        API.frameMs[name] = Math.round(best * 10) / 10;
        if (best > 18) renderer.setPixelRatio(1);
        if (best > 30) scene.traverse((o) => { if (o.isLight) o.castShadow = false; });
      }
    };
  }

  /* ---------- 360 viewer ---------- */
  API.mountViewer = function (canvas, id) {
    let alive = true, raf = 0;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(26, 1, .1, 100);
    rig(renderer, scene);
    const pivot = new T.Group(); scene.add(pivot);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let yaw = -.3, pitch = 0, vy = still ? 0 : .004, drag = false, lx = 0, ly = 0, touched = false;
    emblemReady.then(() => {
      if (!alive) return;
      const g = MODELS[id](); pivot.add(g); frame(cam, g, 1.08);
      g.position.y += 0;
    });
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);
    const down = (e) => { drag = true; touched = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing"; };
    const move = (e) => {
      if (!drag) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      vy = dx * .0065; pitch = Math.max(-.9, Math.min(.9, pitch + dy * .006));
    };
    const up = () => { drag = false; canvas.style.cursor = "grab"; };
    canvas.addEventListener("pointerdown", down); canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    const key = (e) => {
      if (e.key === "ArrowLeft") { vy = -.06; touched = true; }
      if (e.key === "ArrowRight") { vy = .06; touched = true; }
    };
    canvas.addEventListener("keydown", key);
    const tune = tuner(renderer, scene, "viewer");
    const loop = () => {
      if (!alive) return;
      yaw += vy;
      if (!drag) vy = touched ? vy * .95 : vy;
      pivot.rotation.set(pitch, yaw, 0);
      tune(() => renderer.render(scene, cam));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return {
      destroy() {
        alive = false; cancelAnimationFrame(raf); ro.disconnect();
        disposeTree(scene); renderer.dispose(); renderer.forceContextLoss();
      }
    };
  };

})();
