import React, { Suspense, useLayoutEffect, useState, useRef, useEffect } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Grid, Center, Html } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { Maximize, Minimize } from 'lucide-react';
import * as THREE from 'three';

interface Viewer3DProps {
  url: string;
  color?: string;
  onLoaded?: (dimensions: { x: number; y: number; z: number }) => void;
}

const Model = ({ url, color = '#3b82f6', onLoaded }: Viewer3DProps) => {
  // Use generic for useLoader to define the return type as BufferGeometry
  const geometry = useLoader(STLLoader, url) as THREE.BufferGeometry;
  
  useLayoutEffect(() => {
    if (geometry) {
      geometry.computeVertexNormals();
      geometry.center();
      geometry.computeBoundingBox();
      
      if (geometry.boundingBox && onLoaded) {
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        onLoaded({ x: size.x, y: size.y, z: size.z });
      }
    }
  }, [geometry, onLoaded]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
};

const Viewer3D: React.FC<Viewer3DProps> = ({ url, onLoaded }) => {
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!url) return <div className="flex items-center justify-center h-full text-slate-500">No model selected</div>;
  if (error) return <div className="flex items-center justify-center h-full text-red-400">Error loading model</div>;

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full bg-gradient-to-br from-vault-800 to-vault-900 rounded-lg overflow-hidden relative group ${isFullscreen ? 'flex items-center justify-center' : ''}`}
    >
      <Canvas shadows camera={{ position: [0, 0, 15], fov: 50 }}>
        <Suspense fallback={<Html center><div className="text-white animate-pulse">Loading Model...</div></Html>}>
          <Stage environment="city" intensity={0.6} adjustCamera>
             <Center>
               <ErrorBoundary onError={() => setError(true)}>
                 <Model url={url} onLoaded={onLoaded} />
               </ErrorBoundary>
             </Center>
          </Stage>
          <Grid infiniteGrid fadeDistance={50} sectionColor="#475569" cellColor="#334155" />
          <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
        </Suspense>
      </Canvas>
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={toggleFullscreen}
          className="bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      <div className="absolute bottom-4 right-4 bg-black/50 px-3 py-1 rounded text-xs text-slate-300 pointer-events-none">
        LMB: Rotate | RMB: Pan | Scroll: Zoom
      </div>
    </div>
  );
};

// Simple error boundary for the canvas content
class ErrorBoundary extends React.Component<{ children: React.ReactNode, onError: () => void }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("3D Viewer Error:", error);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default Viewer3D;