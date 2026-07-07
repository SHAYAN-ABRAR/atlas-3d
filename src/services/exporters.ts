import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { downloadBlob } from '@/lib/utils';

/**
 * Bakes the live scene (which uses instancing) into plain meshes so any
 * exporter / external viewer can consume the result.
 */
export function bakeWorldGroup(root: THREE.Object3D): THREE.Group {
  const baked = new THREE.Group();
  baked.name = 'atlas3d-world';
  root.updateWorldMatrix(true, true);

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh !== true) return;
    const mesh = obj as THREE.Mesh;
    if (!mesh.visible || !mesh.geometry) return;
    // Skip helpers (grid, gizmos) — they mark themselves with userData.helper.
    if (mesh.userData.helper) return;

    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      const im = mesh as THREE.InstancedMesh;
      const pieces: THREE.BufferGeometry[] = [];
      const tmp = new THREE.Matrix4();
      for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, tmp);
        const g = im.geometry.clone();
        g.applyMatrix4(tmp);
        pieces.push(g);
      }
      if (pieces.length === 0) return;
      const merged = mergeGeometries(pieces, false);
      pieces.forEach((p) => p.dispose());
      if (!merged) return;
      merged.applyMatrix4(im.matrixWorld);
      const out = new THREE.Mesh(merged, (material as THREE.Material).clone());
      out.name = im.name || 'instanced';
      baked.add(out);
    } else {
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      const out = new THREE.Mesh(g, (material as THREE.Material).clone());
      out.name = mesh.name || 'mesh';
      baked.add(out);
    }
  });
  return baked;
}

function disposeGroup(group: THREE.Group) {
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
}

export function exportGLTF(root: THREE.Object3D, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const baked = bakeWorldGroup(root);
    new GLTFExporter().parse(
      baked,
      (result) => {
        disposeGroup(baked);
        const blob =
          result instanceof ArrayBuffer
            ? new Blob([result], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(result)], { type: 'model/gltf+json' });
        downloadBlob(blob, filename);
        resolve();
      },
      (err) => {
        disposeGroup(baked);
        reject(err);
      },
      { binary: true },
    );
  });
}

export function exportOBJ(root: THREE.Object3D, filename: string) {
  const baked = bakeWorldGroup(root);
  const text = new OBJExporter().parse(baked);
  disposeGroup(baked);
  downloadBlob(new Blob([text], { type: 'text/plain' }), filename);
}

export function captureScreenshot(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}
