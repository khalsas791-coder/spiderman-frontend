import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls, OrbitControls, Environment } from '@react-three/drei';

function Model({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={0.01} />;
}

export default function ThreeViewer({ modelUrl }) {
  if (!modelUrl) return (
    <div className="w-full h-[300px] flex items-center justify-center bg-spider-dark rounded-xl border border-white/10 uppercase tracking-widest text-xs text-white/30">
      No 3D Prototype Selected
    </div>
  );

  return (
    <div className="w-full h-[300px] bg-spider-dark rounded-xl overflow-hidden border border-white/10">
      <Canvas dpr={[1, 2]} shadows camera={{ fov: 45 }} style={{ cursor: 'grab' }}>
        <color attach="background" args={['#05060b']} />
        <Suspense fallback={null}>
          <PresentationControls speed={1.5} global zoom={0.5} polar={[-0.1, Math.PI / 4]}>
            <Stage environment="city" intensity={0.6} contactShadow={false}>
              <Model url={modelUrl} />
            </Stage>
          </PresentationControls>
        </Suspense>
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}
