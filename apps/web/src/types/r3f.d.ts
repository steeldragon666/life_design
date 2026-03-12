import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      meshStandardMaterial: ThreeElements['meshStandardMaterial'];
      ambientLight: ThreeElements['ambientLight'];
      spotLight: ThreeElements['spotLight'];
      pointLight: ThreeElements['pointLight'];
    }
  }
}

export {};
