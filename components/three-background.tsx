"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere } from "@react-three/drei";
import { useRef } from "react";
import { Mesh } from "three";

function SpinningSphere() {
  const meshRef = useRef<Mesh>(null);
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.005;
      meshRef.current.rotation.y += 0.005;
    }
  });
  return (
    <Sphere args={[1, 32, 32]} ref={meshRef}>
      <meshStandardMaterial color="hotpink" wireframe />
    </Sphere>
  );
}

export function ThreeBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <SpinningSphere />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}
