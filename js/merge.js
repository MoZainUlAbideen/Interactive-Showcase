// ─────────────────────────────────────────────────────────────
//  Draw-call saver. Every separate mesh costs one draw call (two if it
//  casts a shadow), so a car made of 200 little parts is 400 calls a frame.
//  mergeStatic() bakes all the parts of a group that never move relative
//  to it into one mesh per material. Anything marked
//  `userData.dynamic = true` (wheels, flames, a floating badge...) is left
//  as its own object, and its insides are merged separately.
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const rel = new THREE.Matrix4();
const inv = new THREE.Matrix4();

function collect(root, node, out) {
  for (const child of node.children) {
    if (child.userData.dynamic || !child.visible) continue;
    if (child.isMesh && !child.isInstancedMesh && !child.isSkinnedMesh && !Array.isArray(child.material) && child.geometry.isBufferGeometry) {
      out.push(child);
    }
    collect(root, child, out);
  }
}

// geometry → only position/normal/uv, non-indexed, transformed by m
function prep(geo, m) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  g.morphAttributes = {};
  g.clearGroups();
  g.applyMatrix4(m);
  // a mirrored part (scale -1) would come out inside-out once baked: swap triangle winding
  if (m.determinant() < 0) {
    for (const attr of Object.values(g.attributes)) {
      const a = attr.array, n = attr.itemSize;
      for (let t = 0; t < attr.count; t += 3) {
        for (let k = 0; k < n; k++) { const i1 = (t + 1) * n + k, i2 = (t + 2) * n + k; const tmp = a[i1]; a[i1] = a[i2]; a[i2] = tmp; }
      }
    }
  }
  return g;
}

// two materials that look identical can share one draw call
const PROPS = ['type', 'color', 'emissive', 'emissiveIntensity', 'roughness', 'metalness', 'clearcoat', 'clearcoatRoughness',
  'transmission', 'envMapIntensity', 'opacity', 'transparent', 'side', 'depthWrite', 'depthTest', 'blending', 'flatShading',
  'toneMapped', 'vertexColors', 'alphaTest', 'wireframe', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits'];
const MAPS = ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'envMap'];
function signature(mat) {
  if (mat.userData.unique || mat.isShaderMaterial) return mat.uuid;
  const v = PROPS.map((k) => { const x = mat[k]; return x && x.isColor ? x.getHexString() : x; });
  for (const k of MAPS) v.push(mat[k] ? mat[k].uuid : '');
  return v.join(',');
}
const shared = new Map();

export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  const meshes = [];
  collect(root, root, meshes);

  // bucket by material + shadow flags + draw order
  const buckets = new Map();
  for (const m of meshes) {
    const sig = signature(m.material);
    if (!shared.has(sig)) shared.set(sig, m.material);
    m.material = shared.get(sig);
    const key = `${sig}|${m.castShadow}|${m.receiveShadow}|${m.renderOrder}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(m);
  }

  let removed = 0;
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map((m) => prep(m.geometry, rel.multiplyMatrices(inv, m.matrixWorld)));
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const src = list[0];
    const mesh = new THREE.Mesh(merged, src.material);
    mesh.castShadow = src.castShadow;
    mesh.receiveShadow = src.receiveShadow;
    mesh.renderOrder = src.renderOrder;
    root.add(mesh);
    for (const m of list) {
      // keep any children (lights, sprites, dynamic parts) in place, re-parented to root
      for (const c of [...m.children]) root.attach(c);
      m.removeFromParent();
      removed++;
    }
    removed--;
  }

  // dynamic parts get the same treatment inside themselves
  root.traverse((o) => { if (o !== root && o.userData.dynamic && !o.userData.merged) { o.userData.merged = true; removed += mergeStatic(o); } });
  return removed;
}
