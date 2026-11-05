/* Mariyam Foods: procedural 3D snacks. Same models power product images, the 360 viewer and the hero. */
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

  /* ---------- noise ---------- */
  const hash = (x, y, z) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const fade = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  function noise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
    return lerp(
      lerp(lerp(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), lerp(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
      lerp(lerp(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), lerp(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
      w
    );
  }
  const fbm = (x, y, z) => noise(x, y, z) * .55 + noise(x * 2.1, y * 2.1, z * 2.1) * .3 + noise(x * 4.3, y * 4.3, z * 4.3) * .15;
  function cell(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let best = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const px = xi + a + hash(xi + a, yi + b, zi + c);
      const py = yi + b + hash(yi + b, zi + c, xi + a);
      const pz = zi + c + hash(zi + c, xi + a, yi + b);
      const d = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  /* ---------- geometry helpers ---------- */
  const C = (hex) => new T.Color(hex).convertSRGBToLinear();
  function weldNormals(geo) {
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${Math.round(p.getX(i) * 2000)}_${Math.round(p.getY(i) * 2000)}_${Math.round(p.getZ(i) * 2000)}`;
      let e = map.get(k);
      if (!e) { e = { x: 0, y: 0, z: 0, ids: [] }; map.set(k, e); }
      e.x += n.getX(i); e.y += n.getY(i); e.z += n.getZ(i); e.ids.push(i);
    }
    map.forEach((e) => {
      const l = Math.hypot(e.x, e.y, e.z) || 1;
      e.ids.forEach((i) => n.setXYZ(i, e.x / l, e.y / l, e.z / l));
    });
    n.needsUpdate = true;
    return geo;
  }
  function displace(geo, fn) {
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = fn(x, y, z, uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    }
    return weldNormals(geo);
  }
  function paint(geo, fn) {
    const p = geo.attributes.position, arr = new Float32Array(p.count * 3), out = new T.Color();
    const uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      fn(out, p.getX(i), p.getY(i), p.getZ(i), uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      arr[i * 3] = out.r; arr[i * 3 + 1] = out.g; arr[i * 3 + 2] = out.b;
    }
    geo.setAttribute("color", new T.BufferAttribute(arr, 3));
    return geo;
  }
  function mesh(geo, opts) {
    const m = new T.Mesh(geo, new T.MeshPhysicalMaterial(Object.assign({ vertexColors: true, roughness: .6, metalness: 0, clearcoat: .14, clearcoatRoughness: .5 }, opts)));
    m.castShadow = m.receiveShadow = true;
    return m;
  }
  class Path extends T.Curve {
    constructor(fn) { super(); this.fn = fn; }
    getPoint(t, target = new T.Vector3()) { const a = this.fn(t); return target.set(a[0], a[1], a[2]); }
  }
  const fried = (a, b, c) => { const A = C(a), B = C(b), D = C(c); return (out, t, cavity) => { out.copy(A).lerp(B, Math.min(1, Math.max(0, t))).lerp(D, Math.min(1, Math.max(0, cavity))); }; };

  /* ---------- models ---------- */
  function cashew(scale) {
    const curve = new Path((t) => { const a = -1.05 + t * 3.4; return [Math.cos(a) * .17, Math.sin(a) * .17, 0]; });
    const g = new T.TubeGeometry(curve, 44, .1, 18, false);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), k = .45 + .55 * Math.sin(Math.PI * Math.min(1, u * 1.04)) ** .5;
      const a = -1.05 + u * 3.4, cx = Math.cos(a) * .17, cy = Math.sin(a) * .17;
      pos.setXYZ(i, cx + (pos.getX(i) - cx) * k, cy + (pos.getY(i) - cy) * k, pos.getZ(i) * k);
    }
    weldNormals(g);
    const A = C("#efd190"), B = C("#c9913f");
    paint(g, (o, x, y, z) => o.copy(A).lerp(B, fbm(x * 6, y * 6, z * 6) * 1.1));
    const m = mesh(g, { roughness: .42, clearcoat: .35 });
    m.scale.setScalar(scale);
    return m;
  }
  const seedsOn = (count, fnPos, colorHex, size) => {
    const g = new T.SphereGeometry(1, 10, 8);
    const im = new T.InstancedMesh(g, new T.MeshStandardMaterial({ color: C(colorHex), roughness: .5 }), count);
    const d = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const p = fnPos(i);
      d.position.set(p[0], p[1], p[2]);
      d.rotation.set(rnd() * .5, rnd() * 6.28, rnd() * .5);
      d.scale.set(size * (1 + rnd() * .3), size * .42, size * .66);
      d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    }
    im.castShadow = true;
    return im;
  };

  const MODELS = {
    murukku() {
      const G = new T.Group();
      const turns = 3.5;
      const path = new Path((t) => {
        const r = .1 + .84 * t, a = t * turns * Math.PI * 2;
        return [Math.cos(a) * r, Math.sin(t * 40) * .012, Math.sin(a) * r];
      });
      const g = new T.TubeGeometry(path, 1300, .112, 18, false);
      const ridge = (u, v) => Math.sin(u * 1150 + v * Math.PI * 2);
      displace(g, (x, y, z, u, v) => ridge(u, v) * .012 + (fbm(x * 9, y * 9, z * 9) - .5) * .045 + (.36 - Math.min(.36, cell(x * 24, y * 24, z * 24))) * .075);
      const f = fried("#a95a12", "#e59a26", "#5e2f09");
      paint(g, (o, x, y, z, u, v) => { const c = cell(x * 24, y * 24, z * 24); f(o, fbm(x * 5, y * 5, z * 5) * 1.6 - .1, Math.max(ridge(u, v) < -.6 ? .4 : 0, c > .46 ? (c - .46) * 2.6 : 0)); });
      G.add(mesh(g, { roughness: .58, clearcoat: .3 }));
      const end = new T.SphereGeometry(.11, 14, 12);
      paint(end, (o) => o.copy(C("#b96a18")));
      [path.getPoint(1), path.getPoint(0)].forEach((p) => { const m = mesh(end.clone()); m.position.copy(p); G.add(m); });
      G.rotation.set(1.03, 0, .1);
      return G;
    },
    laddu() {
      const G = new T.Group();
      const g = new T.SphereGeometry(.84, 170, 120);
      displace(g, (x, y, z) => (fbm(x * 2.4, y * 2.4, z * 2.4) - .5) * .09 + (.34 - Math.min(.34, cell(x * 11, y * 11, z * 11))) * .13);
      const f = fried("#c47412", "#eda526", "#7a410c");
      paint(g, (o, x, y, z) => { const c = cell(x * 11, y * 11, z * 11); f(o, fbm(x * 3.2, y * 3.2, z * 3.2) * 1.3 + .06, c > .42 ? (c - .42) * 2.4 : 0); });
      G.add(mesh(g, { roughness: .62, clearcoat: .2 }));
      const c = cashew(1.28);
      c.position.set(.04, .77, .25);
      c.rotation.set(-.5, .1, .45);
      G.add(c);
      G.rotation.set(.2, .4, 0);
      return G;
    },
    adhirasam() {
      const G = new T.Group();
      const g = new T.SphereGeometry(1, 170, 110);
      g.scale(1, .17, 1);
      displace(g, (x, y, z) => (fbm(x * 3.2, y * 3.2 + 4, z * 3.2) - .5) * .09 + (fbm(x * 16, y * 16, z * 16) - .5) * .018);
      const f = fried("#6d2f0a", "#b65f15", "#d78a2d");
      paint(g, (o, x, y, z) => { const r = Math.hypot(x, z); f(o, fbm(x * 4, y * 4, z * 4) * 1.5 - .1, r > .84 ? (r - .84) * 3.4 : 0); });
      G.add(mesh(g, { roughness: .46, clearcoat: .35, clearcoatRoughness: .4 }));
      seed = 77;
      G.add(seedsOn(170, () => {
        const a = rnd() * 6.283, r = Math.sqrt(rnd()) * .92;
        return [Math.cos(a) * r, .17 * Math.sqrt(Math.max(0, 1 - r * r)) + .012, Math.sin(a) * r];
      }, "#f4e0b0", .027));
      G.rotation.set(.92, 0, -.2);
      return G;
    },
    ribbon() {
      const G = new T.Group();
      seed = 11;
      const f = fried("#a85c12", "#e39a28", "#6a370b");
      for (let i = 0; i < 9; i++) {
        const ph = rnd() * 6, amp = .09 + rnd() * .06, len = 1.5 + rnd() * .5, fq = 11 + rnd() * 5;
        const path = new Path((t) => [(t - .5) * len, Math.sin(t * 7 + ph) * .1, Math.sin(t * fq + ph) * amp]);
        const g = new T.TubeGeometry(path, 200, .135, 16, false);
        g.scale(1, .36, 1);
        displace(g, (x, y, z, u) => Math.sin(u * 190) * .011 + (fbm(x * 12 + i, y * 12, z * 12) - .5) * .035);
        paint(g, (o, x, y, z, u) => f(o, fbm(x * 5 + i, y * 5, z * 5) * 1.5, Math.abs(Math.sin(u * 190)) < .14 ? .36 : 0));
        const m = mesh(g, { roughness: .56, clearcoat: .2 });
        const a = i * 1.15 + rnd() * .5;
        m.position.set((rnd() - .5) * .26, -.28 + i * .075, (rnd() - .5) * .26);
        m.rotation.set((rnd() - .5) * .3, a, (rnd() - .5) * .22);
        G.add(m);
      }
      G.rotation.x = .78;
      return G;
    },
    thattai() {
      const G = new T.Group();
      seed = 31;
      const make = () => {
        const g = new T.SphereGeometry(.92, 130, 80);
        g.scale(1, .075, 1);
        displace(g, (x, y, z) => (fbm(x * 5, y * 5, z * 5) - .5) * .05 + (.3 - Math.min(.3, cell(x * 8, y * 8 + 2, z * 8))) * .08);
        const f = fried("#b06a18", "#dd9c38", "#3f2110");
        paint(g, (o, x, y, z) => {
          const speck = noise(x * 26, y * 26, z * 26) > .78 ? .85 : 0;
          const edge = Math.hypot(x, z) > .8 ? .18 : 0;
          f(o, fbm(x * 4, y * 4, z * 4) * 1.5, Math.max(speck, edge));
        });
        return mesh(g, { roughness: .6 });
      };
      [[.0, -.22, .0, .15], [.08, -.02, .04, -.13], [-.05, .17, -.03, .1]].forEach((a, i) => {
        const m = make(); m.position.set(a[0], a[1], a[2]); m.rotation.set(a[3], i * 1.3, a[3] * -.7); G.add(m);
      });
      G.add(seedsOn(22, () => {
        const a = rnd() * 6.283, r = Math.sqrt(rnd()) * .78;
        return [-.05 + Math.cos(a) * r, .25 + rnd() * .012, -.03 + Math.sin(a) * r];
      }, "#2f5d1c", .05));
      G.rotation.set(.88, 0, -.12);
      return G;
    },
    seedai() {
      const G = new T.Group();
      seed = 5;
      const g = new T.SphereGeometry(.2, 30, 22);
      displace(g, (x, y, z) => (fbm(x * 18, y * 18, z * 18) - .5) * .04);
      const f = fried("#8a4a10", "#d78e26", "#5e2f0a");
      paint(g, (o, x, y, z) => f(o, fbm(x * 15, y * 15, z * 15) * 1.6, 0));
      const N = 54;
      const im = new T.InstancedMesh(g, new T.MeshPhysicalMaterial({ vertexColors: true, roughness: .5, clearcoat: .35 }), N);
      const d = new T.Object3D(), col = new T.Color();
      for (let i = 0; i < N; i++) {
        const lay = i / N, y = -.5 + Math.pow(lay, .7) * 1.0, r = (1 - lay) * .95 + .06;
        const a = i * 2.4;
        d.position.set(Math.cos(a) * r * Math.sqrt(rnd()) , y, Math.sin(a) * r * Math.sqrt(rnd()));
        d.rotation.set(rnd() * 6, rnd() * 6, 0);
        d.scale.setScalar(.92 + rnd() * .36);
        d.updateMatrix(); im.setMatrixAt(i, d.matrix);
        col.setScalar(.82 + rnd() * .3); im.setColorAt(i, col);
      }
      im.castShadow = im.receiveShadow = true;
      G.add(im);
      G.userData.radius = 1.3;
      G.rotation.x = .3;
      return G;
    },
    chips() {
      const G = new T.Group();
      seed = 21;
      const mk = () => {
        const g = new T.SphereGeometry(.44, 72, 42);
        g.scale(1, .03, .86);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
          p.setY(i, y + (x * x + z * z) * .28 + Math.sin(x * 8) * .012);
        }
        weldNormals(g);
        const f = fried("#dc9414", "#efb52c", "#8f5210");
        paint(g, (o, x, y, z) => {
          const r = Math.hypot(x, z / .86) / .44, seedRing = r < .36 && noise(x * 40, 2, z * 40) > .7;
          f(o, fbm(x * 8, y * 8, z * 8) * 1.3, Math.max(r > .86 ? (r - .86) * 4.2 : 0, seedRing ? .5 : 0));
        });
        return mesh(g, { roughness: .42, clearcoat: .5, clearcoatRoughness: .3 });
      };
      const n = 22;
      for (let i = 0; i < n; i++) {
        const m = mk(), l = i / n, a = i * 2.39, r = (1 - l) * .64 + .03;
        m.position.set(Math.cos(a) * r, -.5 + l * .95, Math.sin(a) * r);
        m.rotation.set(.55 + rnd() * .9, rnd() * 6, (rnd() - .5) * 1.2);
        G.add(m);
      }
      G.rotation.x = .08;
      return G;
    },
    burfi() {
      const G = new T.Group();
      seed = 44;
      const mk = () => {
        const g = new T.BoxGeometry(1.2, .42, 1.2, 46, 18, 46);
        const p = g.attributes.position, R = .08, hx = .6 - R, hy = .21 - R, v = new T.Vector3();
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
          const ix = Math.max(-hx, Math.min(hx, x)), iy = Math.max(-hy, Math.min(hy, y)), iz = Math.max(-hx, Math.min(hx, z));
          v.set(x - ix, y - iy, z - iz);
          if (v.lengthSq() > 0) v.normalize().multiplyScalar(R);
          p.setXYZ(i, ix + v.x, iy + v.y, iz + v.z);
        }
        displace(g, (x, y, z) => (fbm(x * 5, y * 5, z * 5) - .5) * .03 + (noise(x * 34, y * 34, z * 34) - .5) * .018);
        const A = C("#f4e2b4"), B = C("#e3c683"), D = C("#bb8538");
        paint(g, (o, x, y, z) => {
          o.copy(A).lerp(B, fbm(x * 15, y * 15, z * 15) * 1.4);
          if (Math.abs(x) > .5 || Math.abs(z) > .5 || y < -.12) o.lerp(D, .33);
        });
        return mesh(g, { roughness: .7, clearcoat: .1 });
      };
      const a = mk(); a.position.set(-.28, -.22, .14); a.rotation.y = .79;
      const b = mk(); b.position.set(.3, .2, -.14); b.rotation.set(.04, .48, -.06);
      G.add(a, b);
      const c1 = cashew(.7); c1.position.set(.3, .46, -.14); c1.rotation.set(-1.45, .1, .4);
      G.add(c1);
      G.add(seedsOn(26, () => [.3 + (rnd() - .5) * .78, .42, -.14 + (rnd() - .5) * .78], "#7ea650", .032));
      G.rotation.set(.4, 0, 0);
      return G;
    },
    achu() {
      const G = new T.Group();
      const addTube = (fn, closed, radius, seg, parent) => {
        const g = new T.TubeGeometry(new Path(fn), seg, radius, 12, closed);
        displace(g, (x, y, z) => (fbm(x * 15, y * 15, z * 15) - .5) * .032);
        const f = fried("#b86c16", "#e8a32e", "#7c4410");
        paint(g, (o, x, y, z) => f(o, fbm(x * 5, y * 5, z * 5) * 1.5, 0));
        (parent || G).add(mesh(g, { roughness: .46, clearcoat: .45 }));
      };
      const TAU = Math.PI * 2;
      addTube((t) => { const a = t * TAU, r = .73 + .17 * Math.cos(8 * a); return [Math.cos(a) * r, 0, Math.sin(a) * r]; }, true, .068, 340);
      addTube((t) => { const a = t * TAU, r = .34 + .09 * Math.cos(8 * a + Math.PI); return [Math.cos(a) * r, .02, Math.sin(a) * r]; }, true, .062, 220);
      addTube((t) => { const a = t * TAU; return [Math.cos(a) * .1, .02, Math.sin(a) * .1]; }, true, .052, 60);
      for (let i = 0; i < 8; i++) {
        const ang = i / 8 * TAU, c = Math.cos(ang), s = Math.sin(ang);
        addTube((t) => { const r = .4 + t * .4; return [c * r, .01, s * r]; }, false, .05, 22);
        const a2 = ang + Math.PI / 8, cx = Math.cos(a2) * .56, cz = Math.sin(a2) * .56;
        addTube((t) => { const a = t * TAU; return [cx + Math.cos(a) * .115, .01, cz + Math.sin(a) * .115]; }, true, .042, 38);
      }
      G.rotation.set(.98, 0, .12);
      return G;
    },
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

  /* ---------- hero ---------- */
  API.mountHero = function (canvas) {
    let alive = true, raf = 0, visible = true, mx = 0, my = 0, sx = 0, sy = 0;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    const scene = new T.Scene(), cam = new T.PerspectiveCamera(28, 1, .1, 100);
    cam.position.set(0, 0, 9.2);
    rig(renderer, scene);
    const world = new T.Group(); scene.add(world);

    const place = (id, s, x, y, z, spin) => {
      const inner = MODELS[id]();
      const box = new T.Box3().setFromObject(inner), c = box.getCenter(new T.Vector3());
      inner.position.sub(c);
      const holder = new T.Group(); holder.add(inner);
      holder.scale.setScalar(s); holder.position.set(x, y, z);
      holder.userData = { base: new T.Vector3(x, y, z), spin, ph: rnd() * 6 };
      world.add(holder);
      return holder;
    };
    const items = [
      place("murukku", 1.42, -.22, .22, 0, [.0, .0022, .0035]),
      place("laddu", .72, 1.46, -.62, 1.2, [.0, .003, 0]),
      place("adhirasam", .72, 1.34, 1.3, -1.1, [.0, .0028, .0016])
    ];
    // orbit rings and sesame field
    const ringMat = new T.MeshBasicMaterial({ color: C("#ffc95c") });
    const orbit = new T.Group();
    [[2.5, .008, 1.26, .24], [2.82, .005, 1.4, -.18]].forEach((a) => {
      const r = new T.Mesh(new T.TorusGeometry(a[0], a[1], 8, 220), ringMat);
      r.rotation.set(a[2], a[3], 0); orbit.add(r);
    });
    world.add(orbit);
    const spark = new T.Mesh(new T.SphereGeometry(.05, 16, 12), new T.MeshBasicMaterial({ color: new T.Color(2.4, 1.7, .7) }));
    orbit.children[0].add(spark);
    seed = 9;
    const field = seedsOn(80, () => {
      const a = rnd() * 6.283, b = Math.acos(2 * rnd() - 1), r = 2.2 + rnd() * 1.5;
      return [Math.sin(b) * Math.cos(a) * r * 1.2, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r - .4];
    }, "#e9c27a", .017);
    world.add(field);

    const fit = () => {
      const r = canvas.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      cam.aspect = r.width / Math.max(1, r.height);
      cam.position.z = cam.aspect < 1 ? 9.2 / Math.max(.72, cam.aspect) : 9.2;
      cam.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(canvas);
    const onMove = (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; };
    addEventListener("pointermove", onMove, { passive: true });
    const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible && !raf && alive) tick(); });
    io.observe(canvas);

    const tune = tuner(renderer, scene, "hero");
    const draw = (t) => {
      sx += (mx - sx) * .05; sy += (my - sy) * .05;
      const sc = Math.min(1, scrollY / 900);
      world.rotation.y = sx * .5 + sc * .9;
      world.rotation.x = sy * .3 + sc * .28;
      items.forEach((h) => {
        const u = h.userData;
        h.position.y = u.base.y + Math.sin(t * .0008 + u.ph) * .09;
        h.rotation.y += u.spin[1]; h.rotation.z += u.spin[2];
      });
      const sa = t * .00035; spark.position.set(Math.cos(sa) * 2.5, Math.sin(sa) * 2.5, 0);
      field.rotation.y = t * .00004;
      tune(() => renderer.render(scene, cam));
    };
    const tick = () => {
      raf = 0;
      if (!alive || !visible) return;
      draw(performance.now());
      raf = requestAnimationFrame(tick);
    };
    if (still) draw(0); else tick();
    return {
      destroy() {
        alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
        removeEventListener("pointermove", onMove);
        disposeTree(scene); renderer.dispose(); renderer.forceContextLoss();
      }
    };
  };
})();
