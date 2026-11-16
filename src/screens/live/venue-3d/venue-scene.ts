import * as THREE from "three";
import type { ExpoWebGLRenderingContext } from "expo-gl";
import type { TVenueLayout } from "./venue-layouts";

/**
 * The 3D venue in the app: the same layouts as the website
 * (components/three/venue-scene.ts there), drawn into an expo-gl view. Touch
 * handling lives in the component; this turns, zooms, picks and flies.
 */

export type TSceneZone = { zone: string; color: string; soldOut: boolean };

type TBuiltZone = { meshes: THREE.Object3D[]; eye: THREE.Vector3; label: THREE.Vector3 };

const STAGE_LOOK = new THREE.Vector3(0, 2.4, -8);

const material = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...extra });

/** A flat block an area stands on. */
const pad = (w: number, d: number, x: number, y: number, z: number, h = 0.25) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material("#888888", { transparent: true, opacity: 0.92 }));
  mesh.position.set(x, y + h / 2, z);
  return mesh;
};

/** Rows of seats as low blocks, for seated areas. */
const seatRows = (rows: number, width: number, x: number, z: number, y = 0, gap = 1.1) =>
  Array.from({ length: rows }, (_, row) => pad(width, 0.7, x, y + row * 0.18, z + row * gap, 0.45));

const stageSet = (scene: THREE.Scene, width = 12, screens = 1) => {
  const stage = new THREE.Mesh(new THREE.BoxGeometry(width, 1.2, 4), material("#1f2a37"));
  stage.position.set(0, 0.6, -8);
  scene.add(stage);
  const glow = { emissive: new THREE.Color("#00b2ff"), emissiveIntensity: 0.35 };
  if (screens === 1) {
    const screen = new THREE.Mesh(new THREE.BoxGeometry(width - 2, 4.5, 0.2), material("#0b1d2a", glow));
    screen.position.set(0, 3.6, -9.8);
    scene.add(screen);
  } else {
    [-width / 3, width / 3].forEach((x) => {
      const screen = new THREE.Mesh(new THREE.BoxGeometry(width / 3, 3, 0.2), material("#0b1d2a", glow));
      screen.position.set(x, 3.4, -9.8);
      scene.add(screen);
    });
  }
  [-0.38, -0.13, 0.13, 0.38].forEach((share) => {
    const light = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.4, 12),
      material("#f5f5f5", { emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.6 }),
    );
    light.position.set(share * width, 6.1, -9.4);
    scene.add(light);
  });
};

const booths = (x: number, zs: number[]) =>
  zs.flatMap((z) => {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.9, 16), material("#fde68a"));
    table.position.set(x, 0.8, z);
    return [pad(3, 2.6, x, 0, z, 0.35), table];
  });

/** Each layout: the fixed set pieces, and every area's shapes, eye point and label spot. */
const LAYOUTS: Record<TVenueLayout, (scene: THREE.Scene) => Record<string, TBuiltZone>> = {
  concert: (scene) => {
    stageSet(scene);
    return {
      front_pit: { meshes: [pad(11, 4, 0, 0, -3.6)], eye: new THREE.Vector3(0, 1.7, -2.6), label: new THREE.Vector3(0, 2.1, -3.6) },
      main_floor: { meshes: [pad(15, 7, 0, 0, 2.6)], eye: new THREE.Vector3(0, 1.7, 3.6), label: new THREE.Vector3(0, 2.1, 2.6) },
      side_booths: { meshes: [...booths(-9.5, [-4, 0, 4]), ...booths(9.5, [-4, 0, 4])], eye: new THREE.Vector3(9.5, 1.5, 0.5), label: new THREE.Vector3(9.5, 2.6, -6.4) },
      balcony: {
        meshes: [0, 1, 2].map((i) => pad(18, 2, 0, 1.2 + i * 0.9, 8.6 + i * 1.8, 0.4)),
        eye: new THREE.Vector3(0, 4.6, 11.5),
        label: new THREE.Vector3(0, 5.6, 10.4),
      },
    };
  },
  club: (scene) => {
    const booth = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 2.5), material("#1f2a37"));
    booth.position.set(0, 0.55, -8);
    scene.add(booth);
    const decks = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1), material("#0b1d2a", { emissive: new THREE.Color("#a855f7"), emissiveIntensity: 0.5 }));
    decks.position.set(0, 1.25, -8);
    scene.add(decks);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 10), material("#3f2d1f"));
    counter.position.set(-11, 0.55, 0);
    scene.add(counter);
    return {
      dance_floor: { meshes: [pad(10, 9, 0, 0, -1.5)], eye: new THREE.Vector3(0, 1.7, -0.5), label: new THREE.Vector3(0, 2.1, -1.5) },
      bar: { meshes: [pad(3.5, 10, -8.6, 0, 0)], eye: new THREE.Vector3(-8.6, 1.7, 3), label: new THREE.Vector3(-8.6, 2.4, -4.5) },
      vip_booths: { meshes: booths(9, [-5, -1, 3]), eye: new THREE.Vector3(9, 1.5, 4.5), label: new THREE.Vector3(9, 2.6, -6.6) },
      mezzanine: { meshes: [pad(20, 4, 0, 2.6, 8.5, 0.4)], eye: new THREE.Vector3(0, 4.7, 9.5), label: new THREE.Vector3(0, 4.4, 8.5) },
    };
  },
  festival: (scene) => {
    stageSet(scene, 16);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 1.2), material("#374151"));
    [-9, 9].forEach((x) => {
      const t = tower.clone();
      t.position.set(x, 3.5, -8);
      scene.add(t);
    });
    return {
      front_stage: { meshes: [pad(14, 5, 0, 0, -3)], eye: new THREE.Vector3(0, 1.7, -1.8), label: new THREE.Vector3(0, 2.1, -3) },
      general_field: { meshes: [pad(22, 8, 0, 0, 4.5)], eye: new THREE.Vector3(0, 1.7, 5.5), label: new THREE.Vector3(0, 2.1, 4.5) },
      vip_deck: { meshes: [pad(5, 6, -12, 1.2, -3, 0.4)], eye: new THREE.Vector3(-12, 3.2, -1.5), label: new THREE.Vector3(-12, 3.4, -3) },
      back_lawn: { meshes: [pad(22, 4, 0, 0, 11)], eye: new THREE.Vector3(0, 1.6, 12), label: new THREE.Vector3(0, 2.1, 11) },
    };
  },
  theatre: (scene) => {
    stageSet(scene, 14);
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.3), material("#7f1d1d"));
    curtain.position.set(0, 3.5, -10.2);
    scene.add(curtain);
    return {
      front_stalls: { meshes: seatRows(4, 13, 0, -4), eye: new THREE.Vector3(0, 1.4, -2.6), label: new THREE.Vector3(0, 2.2, -3) },
      back_stalls: { meshes: seatRows(4, 15, 0, 1.2), eye: new THREE.Vector3(0, 1.8, 3.6), label: new THREE.Vector3(0, 2.6, 2.6) },
      circle: { meshes: seatRows(3, 18, 0, 8, 2.6, 1.3), eye: new THREE.Vector3(0, 4.6, 10.2), label: new THREE.Vector3(0, 4.9, 9) },
      boxes: {
        meshes: [-11, 11].flatMap((x) => [-3, 1].map((z) => pad(2.2, 2.6, x, 2.4, z, 0.4))),
        eye: new THREE.Vector3(11, 4, 1),
        label: new THREE.Vector3(11, 4.2, -5.5),
      },
    };
  },
  conference: (scene) => {
    stageSet(scene, 12, 2);
    const lectern = new THREE.Mesh(new THREE.BoxGeometry(1, 1.3, 0.7), material("#334155"));
    lectern.position.set(3.5, 1.85, -7.2);
    scene.add(lectern);
    return {
      front_rows: { meshes: seatRows(3, 12, 0, -3.5), eye: new THREE.Vector3(0, 1.4, -2.4), label: new THREE.Vector3(0, 2.1, -2.6) },
      main_seating: { meshes: seatRows(4, 14, 0, 0.8), eye: new THREE.Vector3(0, 1.4, 3), label: new THREE.Vector3(0, 2.3, 2.2) },
      back_rows: { meshes: seatRows(3, 16, 0, 6), eye: new THREE.Vector3(0, 1.6, 8.6), label: new THREE.Vector3(0, 2.4, 7.2) },
      expo_area: {
        meshes: [-11.5, 11.5].flatMap((x) => [-2, 2, 6].map((z) => pad(2.4, 2.4, x, 0, z, 1.2))),
        eye: new THREE.Vector3(11.5, 1.7, 9),
        label: new THREE.Vector3(11.5, 2.8, -4.4),
      },
    };
  },
};


export type TVenueScene = {
  rotate: (dx: number, dy: number) => void;
  zoom: (factor: number) => void;
  /** The area under a tap (in view points), or null. */
  pick: (x: number, y: number) => string | null;
  select: (zone: string | null) => void;
  viewFrom: (zone: string | null) => void;
  dispose: () => void;
};

export const createVenueScene = (
  gl: ExpoWebGLRenderingContext,
  options: { layout: TVenueLayout; zones: TSceneZone[]; width: number; height: number; reduceMotion: boolean }
): TVenueScene => {
  const { drawingBufferWidth: bufferWidth, drawingBufferHeight: bufferHeight } = gl;
  // three.js wants a canvas; expo-gl gives a context, so a stand-in carries it.
  const canvas = {
    width: bufferWidth,
    height: bufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    clientHeight: bufferHeight,
    getContext: () => gl
  } as unknown as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(bufferWidth, bufferHeight, false);
  renderer.setClearColor(0xe9f0f7, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, bufferWidth / bufferHeight, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(6, 14, 10);
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 26), material("#dfe7f0"));
  floor.position.y = -0.1;
  scene.add(floor);

  const built = LAYOUTS[options.layout](scene);
  const areas = new Map<string, { meshes: THREE.Mesh[]; eye: THREE.Vector3; color: string }>();
  for (const zone of options.zones) {
    const shape = built[zone.zone];
    if (!shape) continue;
    const color = zone.soldOut ? "#8a949e" : zone.color;
    const meshes: THREE.Mesh[] = [];
    shape.meshes.forEach((object) => {
      if (object instanceof THREE.Mesh) {
        (object.material as THREE.MeshStandardMaterial).color.set(color);
        object.userData.zone = zone.zone;
        meshes.push(object);
      }
      scene.add(object);
    });
    areas.set(zone.zone, { meshes, eye: shape.eye, color });
  }
  for (const [key, shape] of Object.entries(built)) {
    if (areas.has(key)) continue;
    shape.meshes.forEach((object) => {
      if (object instanceof THREE.Mesh) {
        const mat = object.material as THREE.MeshStandardMaterial;
        mat.color.set("#cbd5e1");
        mat.opacity = 0.5;
      }
      scene.add(object);
    });
  }

  const target = new THREE.Vector3(0, 1, 0);
  let theta = 0.55;
  let phi = 1.0;
  let radius = 32;
  let inside = false;
  let selected: string | null = null;
  let touching = false;
  const currentLook = target.clone();
  let flight: { from: THREE.Vector3; to: THREE.Vector3; lookFrom: THREE.Vector3; lookTo: THREE.Vector3; t: number } | null = null;
  const overview = () =>
    new THREE.Vector3(radius * Math.sin(phi) * Math.sin(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.cos(theta));
  const flyTo = (position: THREE.Vector3, look: THREE.Vector3) => {
    if (options.reduceMotion) {
      camera.position.copy(position);
      currentLook.copy(look);
      camera.lookAt(look);
      return;
    }
    flight = { from: camera.position.clone(), to: position.clone(), lookFrom: currentLook.clone(), lookTo: look.clone(), t: 0 };
  };
  camera.position.copy(overview());
  camera.lookAt(target);

  let frame = 0;
  let alive = true;
  const tick = () => {
    if (!alive) return;
    if (flight) {
      flight.t = Math.min(1, flight.t + 0.03);
      const k = 1 - Math.pow(1 - flight.t, 3);
      camera.position.lerpVectors(flight.from, flight.to, k);
      currentLook.lerpVectors(flight.lookFrom, flight.lookTo, k);
      camera.lookAt(currentLook);
      if (flight.t === 1) flight = null;
    } else if (!inside) {
      if (!touching && !options.reduceMotion && !selected) theta += 0.0015;
      camera.position.copy(overview());
      currentLook.copy(target);
      camera.lookAt(target);
    }
    renderer.render(scene, camera);
    gl.endFrameEXP();
    frame = requestAnimationFrame(tick);
  };
  tick();

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let settle: ReturnType<typeof setTimeout> | null = null;

  return {
    rotate: (dx, dy) => {
      if (inside) return;
      touching = true;
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => (touching = false), 800);
      theta -= dx * 0.01;
      phi = Math.min(1.35, Math.max(0.35, phi - dy * 0.008));
    },
    zoom: (factor) => {
      if (inside) return;
      radius = Math.min(46, Math.max(14, radius / factor));
    },
    pick: (x, y) => {
      ndc.set((x / options.width) * 2 - 1, -(y / options.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects([...areas.values()].flatMap((area) => area.meshes))[0];
      return (hit?.object.userData.zone as string | undefined) ?? null;
    },
    select: (zone) => {
      selected = zone;
      areas.forEach((area, key) =>
        area.meshes.forEach((mesh) => {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          const on = key === zone;
          mat.emissive.set(on ? area.color : "#000000");
          mat.emissiveIntensity = on ? 0.45 : 0;
          mat.opacity = !zone || on ? 0.92 : 0.45;
        })
      );
    },
    viewFrom: (zone) => {
      const area = zone ? areas.get(zone) : null;
      if (area) {
        inside = true;
        flyTo(area.eye, STAGE_LOOK);
      } else {
        inside = false;
        flyTo(overview(), target);
      }
    },
    dispose: () => {
      alive = false;
      cancelAnimationFrame(frame);
      if (settle) clearTimeout(settle);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach((mat) => mat.dispose());
        }
      });
      renderer.dispose();
    }
  };
};
