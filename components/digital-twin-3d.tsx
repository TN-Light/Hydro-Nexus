"use client"

import { useRef, useMemo } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Html } from "@react-three/drei"
import * as THREE from "three"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SensorValues {
  pH: number
  ec: number
  moisture: number
  temperature: number
  humidity: number
  nutrientPumpOn: boolean
  pawPumpOn: boolean
}

interface DigitalTwinSceneProps {
  bag1Data: SensorValues
  bag6Data: SensorValues
  selectedBag: string
  onBagClick: (id: string) => void
  lightingLevel: number
  showFungalNetwork: boolean
  showWaterFlow: boolean
  pawActive: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function phToColor(pH: number): THREE.Color {
  // Red (acidic <5) → Green (6) → Blue (alkaline >8)
  if (pH < 5.5) return new THREE.Color(0.9, 0.2, 0.2)
  if (pH < 6) return new THREE.Color(0.9, 0.7, 0.1)
  if (pH <= 6.5) return new THREE.Color(0.1, 0.8, 0.2)
  if (pH <= 7) return new THREE.Color(0.1, 0.7, 0.5)
  return new THREE.Color(0.2, 0.3, 0.9)
}

function moistureToOpacity(moisture: number): number {
  return THREE.MathUtils.clamp(moisture / 100, 0.2, 0.85)
}

// ---------------------------------------------------------------------------
// Sub-components: Infrastructure
// ---------------------------------------------------------------------------

/** The grow table / bench */
function GrowTable() {
  return (
    <group position={[0, -0.6, 0]}>
      {/* Table top */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[10, 0.12, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
      </mesh>
      {/* Legs */}
      {[[-4.5, -0.6, -2.7], [-4.5, -0.6, 2.7], [4.5, -0.6, -2.7], [4.5, -0.6, 2.7]].map((pos, i) => (
        <mesh key={i} position={pos as [number, number, number]} castShadow>
          <boxGeometry args={[0.15, 1.2, 0.15]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
        </mesh>
      ))}
      {/* Drain tray */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[9.5, 0.03, 5.6]} />
        <meshStandardMaterial color="#666" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}

/** Individual grow bag with substrate visualization */
function GrowBag({
  position,
  bagId,
  hasSensor,
  sensorData,
  isSelected,
  onClick,
}: {
  position: [number, number, number]
  bagId: string
  hasSensor: boolean
  sensorData?: SensorValues
  isSelected: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const glowRef = useRef<THREE.Mesh>(null!)

  useFrame((_, delta) => {
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshStandardMaterial
      if (isSelected) {
        mat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.003) * 0.15
      } else {
        mat.emissiveIntensity = lerp(mat.emissiveIntensity, 0, delta * 3)
      }
    }
  })

  const moistureLevel = sensorData ? moistureToOpacity(sensorData.moisture) : 0.5
  const bagColor = hasSensor
    ? (sensorData ? phToColor(sensorData.pH) : new THREE.Color(0.3, 0.3, 0.3))
    : new THREE.Color(0.35, 0.28, 0.18)

  const bagNum = bagId.replace("grow-bag-", "")

  return (
    <group position={position}>
      {/* Selection glow ring */}
      <mesh ref={glowRef} position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.65, 16]} />
        <meshStandardMaterial
          color={isSelected ? "#22d3ee" : "#444"}
          emissive={isSelected ? "#22d3ee" : "#000"}
          emissiveIntensity={0}
          transparent
          opacity={isSelected ? 0.8 : 0.2}
        />
      </mesh>

      {/* Bag body (fabric) */}
      <mesh
        ref={meshRef}
        castShadow
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <cylinderGeometry args={[0.42, 0.48, 0.65, 12]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.95}
        />
      </mesh>

      {/* Substrate fill (visible inside top) */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.39, 0.39, 0.35, 12]} />
        <meshStandardMaterial
          color={new THREE.Color(0.25, 0.18, 0.08)} // cocopeat + biochar
          roughness={1}
        />
      </mesh>

      {/* Moisture indicator (water level inside) */}
      <mesh position={[0, -0.1 + moistureLevel * 0.15, 0]}>
        <cylinderGeometry args={[0.37, 0.37, moistureLevel * 0.3, 12]} />
        <meshStandardMaterial
          color="#2196f3"
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Plant (stylized) */}
      <group position={[0, 0.5, 0]}>
        {/* Stems */}
        {[0, 1.6, 3.2].map((rot, i) => (
          <mesh key={i} position={[Math.sin(rot) * 0.08, i * 0.08, Math.cos(rot) * 0.08]} rotation={[Math.sin(rot) * 0.3, rot, 0]}>
            <capsuleGeometry args={[0.02, 0.3, 3, 6]} />
            <meshStandardMaterial color="#2d7a2d" roughness={0.7} />
          </mesh>
        ))}
        {/* Leaves */}
        {[0, 2.1, 4.2].map((rot, i) => (
          <mesh
            key={`leaf-${i}`}
            position={[Math.sin(rot) * 0.15, 0.18 + i * 0.08, Math.cos(rot) * 0.15]}
            rotation={[Math.sin(rot) * 0.4, rot, Math.cos(rot) * 0.2]}
          >
            <planeGeometry args={[0.2, 0.12]} />
            <meshStandardMaterial color="#1a6b1a" side={THREE.DoubleSide} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Sensor probe (only on bag 1 & 6) */}
      {hasSensor && (
        <group position={[0.35, 0.2, 0.35]}>
          {/* Probe body */}
          <mesh>
            <capsuleGeometry args={[0.025, 0.35, 3, 6]} />
            <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
          </mesh>
          {/* LED indicator */}
          <mesh position={[0, 0.2, 0.03]}>
            <sphereGeometry args={[0.015, 6, 6]} />
            <meshStandardMaterial
              color={sensorData ? "#00ff00" : "#ff0000"}
              emissive={sensorData ? "#00ff00" : "#ff0000"}
              emissiveIntensity={1.5}
            />
          </mesh>
          {/* Label */}
          <Html position={[0, 0.48, 0]} center style={{ pointerEvents: 'none' }}>
            <span style={{ color: '#22d3ee', fontSize: '10px', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 0 4px #22d3ee' }}>ESP32</span>
          </Html>
        </group>
      )}

      {/* Grommet ports (2 per bag, X-axis only to reduce mesh count) */}
      <mesh position={[0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.015, 6, 12]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.06, 0.015, 6, 12]} />
        <meshStandardMaterial color="#777" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Bag label — only shown when selected */}
      {isSelected && (
        <Html position={[0, -0.45, 0.5]} center style={{ pointerEvents: 'none' }}>
          <span style={{ color: '#22d3ee', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 0 6px #22d3ee' }}>{`Bag ${bagNum}`}</span>
        </Html>
      )}

      {/* Drip emitter on top */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.03, 0.02, 0.06, 8]} />
        <meshStandardMaterial color="#444" metalness={0.5} />
      </mesh>
    </group>
  )
}

/** CMN Cartridge connecting two bags (supports any direction) */
function CMNCartridge({
  from,
  to,
  showFungalNetwork,
}: {
  from: [number, number, number]
  to: [number, number, number]
  showFungalNetwork: boolean
}) {
  const { midPoint, tubeLength, quat } = useMemo(() => {
    const f = new THREE.Vector3(...from)
    const t = new THREE.Vector3(...to)
    const mid = f.clone().add(t).multiplyScalar(0.5)
    const dir = t.clone().sub(f)
    const dist = dir.length()
    const tubeLen = Math.max(0.1, dist - 0.96)
    dir.normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir
    )
    return { midPoint: mid, tubeLength: tubeLen, quat: [q.x, q.y, q.z, q.w] as [number, number, number, number] }
  }, [from, to])

  const fungalRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (fungalRef.current && showFungalNetwork) {
      const mat = fungalRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.3 + Math.sin(Date.now() * 0.002) * 0.2
    }
  })

  return (
    <group position={[midPoint.x, midPoint.y, midPoint.z]} quaternion={quat}>
      {/* Polypropylene tube */}
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, tubeLength, 8, 1, true]} />
        <meshStandardMaterial
          color="#c4b896"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          roughness={0.4}
        />
      </mesh>

      {/* 50µm mesh barriers (both ends) */}
      <mesh position={[0, -tubeLength / 2, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.01, 8]} />
        <meshStandardMaterial color="#b0b0b0" metalness={0.9} roughness={0.1} wireframe />
      </mesh>
      <mesh position={[0, tubeLength / 2, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.01, 8]} />
        <meshStandardMaterial color="#b0b0b0" metalness={0.9} roughness={0.1} wireframe />
      </mesh>

      {/* Fungal network visualization (glowing threads) */}
      {showFungalNetwork && (
        <mesh ref={fungalRef}>
          <cylinderGeometry args={[0.025, 0.025, tubeLength * 0.9, 4]} />
          <meshStandardMaterial
            color="#8b5cf6"
            emissive="#8b5cf6"
            emissiveIntensity={0.3}
            transparent
            opacity={0.4}
            wireframe
          />
        </mesh>
      )}
    </group>
  )
}

/** Irrigation drip line — separate run per row for proper routing */
function DripLine({ bagPositions }: { bagPositions: [number, number, number][] }) {
  // Split into 3 straight rows of 6
  const rows = useMemo(() => {
    const r: THREE.CatmullRomCurve3[] = []
    for (let row = 0; row < 3; row++) {
      const start = row * 6
      // Sort row positions by X so the curve is straight
      const rowBags = bagPositions.slice(start, start + 6)
        .map(p => new THREE.Vector3(p[0], 0.55, p[2]))
        .sort((a, b) => a.x - b.x)
      // Extend slightly past the ends
      const pts = [
        new THREE.Vector3(rowBags[0].x - 0.6, 0.55, rowBags[0].z),
        ...rowBags,
        new THREE.Vector3(rowBags[5].x + 0.6, 0.55, rowBags[5].z),
      ]
      r.push(new THREE.CatmullRomCurve3(pts))
    }
    return r
  }, [bagPositions])

  return (
    <group>
      {rows.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 32, 0.02, 6, false]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** Animated water droplets flowing through drip line */
function WaterFlow({
  bagPositions,
  active,
  isPAW,
}: {
  bagPositions: [number, number, number][]
  active: boolean
  isPAW: boolean
}) {
  const dropsRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!dropsRef.current || !active) return
    dropsRef.current.children.forEach((drop, i) => {
      const speed = 0.015 + i * 0.002
      drop.position.y -= speed
      if (drop.position.y < -0.1) {
        drop.position.y = 0.55
      }
    })
  })

  if (!active) return null

  const color = isPAW ? "#a855f7" : "#3b82f6"

  return (
    <group ref={dropsRef}>
      {bagPositions.map((pos, i) => (
        <mesh
          key={i}
          position={[pos[0], 0.55 - ((i % 6) * 0.08), pos[2]]}
        >
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}
    </group>
  )
}

/** LED panel above the grow area */
function LEDPanel({ intensity }: { intensity: number }) {
  const normalizedIntensity = intensity / 100

  return (
    <group position={[0, 2.2, 0]}>
      {/* Panel frame */}
      <mesh>
        <boxGeometry args={[9, 0.08, 5.4]} />
        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* LED arrays (emissive only, no point lights) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const x = -4 + i * 0.73
        const isRed = i % 2 === 0
        return (
          <mesh key={i} position={[x, -0.05, 0]}>
            <boxGeometry args={[0.5, 0.02, 5]} />
            <meshStandardMaterial
              color={isRed ? "#ff1a1a" : "#1a1aff"}
              emissive={isRed ? "#ff0000" : "#0000ff"}
              emissiveIntensity={normalizedIntensity * 2}
              transparent
              opacity={0.3 + normalizedIntensity * 0.7}
            />
          </mesh>
        )
      })}

      {/* Mounting brackets */}
      {[-4.2, 4.2].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 0]}>
          <boxGeometry args={[0.05, 1, 0.05]} />
          <meshStandardMaterial color="#555" metalness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

/** Pump unit visualization */
function PumpUnit({
  position,
  label,
  color,
  isOn,
}: {
  position: [number, number, number]
  label: string
  color: string
  isOn: boolean
}) {
  const bodyRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (bodyRef.current && isOn) {
      bodyRef.current.rotation.y += 0.02
    }
  })

  return (
    <group position={position}>
      {/* Pump body */}
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.4, 0.25]} />
        <meshStandardMaterial
          color="#333"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Impeller (spins when on) */}
      <mesh ref={bodyRef} position={[0, 0.22, 0]}>
        <torusGeometry args={[0.08, 0.02, 6, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={isOn ? color : "#000"}
          emissiveIntensity={isOn ? 1 : 0}
          metalness={0.5}
        />
      </mesh>

      {/* Status LED */}
      <mesh position={[0, 0, 0.13]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color={isOn ? "#00ff00" : "#ff0000"}
          emissive={isOn ? "#00ff00" : "#ff0000"}
          emissiveIntensity={isOn ? 2 : 0.5}
        />
      </mesh>

      {/* Pipe outlet */}
      <mesh position={[0.2, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
        <meshStandardMaterial color="#555" metalness={0.6} />
      </mesh>

      {/* Label */}
      <Html position={[0, -0.35, 0.14]} center style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
          <div style={{ color: isOn ? color : '#888', fontSize: '9px', fontWeight: 'bold' }}>{label}</div>
          <div style={{ color: isOn ? '#00ff00' : '#ff4444', fontSize: '8px' }}>{isOn ? 'RUNNING' : 'OFF'}</div>
        </div>
      </Html>
    </group>
  )
}

/** Nutrient reservoir tank */
function ReservoirTank({
  position,
  label,
  color,
  level,
}: {
  position: [number, number, number]
  label: string
  color: string
  level: number
}) {
  return (
    <group position={position}>
      {/* Tank body (transparent) */}
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.8, 10, 1, true]} />
        <meshStandardMaterial
          color="#aaa"
          transparent
          opacity={0.15}
          side={THREE.DoubleSide}
          roughness={0.1}
        />
      </mesh>

      {/* Liquid fill */}
      <mesh position={[0, -0.4 + level * 0.35, 0]}>
        <cylinderGeometry args={[0.28, 0.28, level * 0.7, 10]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Cap */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 10]} />
        <meshStandardMaterial color="#666" metalness={0.7} />
      </mesh>

      {/* Label */}
      <Html position={[0, -0.55, 0.35]} center style={{ pointerEvents: 'none' }}>
        <span style={{ color: '#ccc', fontSize: '9px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{label}</span>
      </Html>
    </group>
  )
}

/** Floating sensor data HUD above a bag */
function SensorHUD({
  position,
  data,
  visible,
}: {
  position: [number, number, number]
  data: SensorValues
  visible: boolean
}) {
  if (!visible) return null

  return (
    <Html position={[position[0], position[1] + 1.4, position[2]]} center>
      <div style={{
        background: 'rgba(10,10,26,0.92)',
        border: '1px solid #22d3ee',
        borderRadius: '6px',
        padding: '8px 12px',
        fontFamily: 'monospace',
        color: '#94a3b8',
        fontSize: '11px',
        lineHeight: '1.6',
        minWidth: '150px',
        boxShadow: '0 0 12px rgba(34,211,238,0.2)',
        pointerEvents: 'none',
      }}>
        <div style={{ color: '#22d3ee', fontWeight: 'bold', marginBottom: '4px', fontSize: '12px', letterSpacing: '1px' }}>
          LIVE SENSOR DATA
        </div>
        <div>pH: <span style={{ color: '#' + phToColor(data.pH).getHexString() }}>{data.pH.toFixed(1)}</span> {data.pH >= 5.5 && data.pH <= 6.5 ? '✓' : '⚠'}</div>
        <div>EC: {data.ec.toFixed(2)} mS/cm</div>
        <div>Temp: {data.temperature.toFixed(1)}°C</div>
        <div>Moist: {data.moisture.toFixed(0)}%</div>
        <div>RH: {data.humidity.toFixed(0)}%</div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: data.nutrientPumpOn ? '#22c55e' : '#ef4444', boxShadow: data.nutrientPumpOn ? '0 0 4px #22c55e' : 'none' }} />
            NUT
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: data.pawPumpOn ? '#a855f7' : '#ef4444', boxShadow: data.pawPumpOn ? '0 0 4px #a855f7' : 'none' }} />
            PAW
          </span>
        </div>
      </div>
    </Html>
  )
}

/** Fungal hyphae network visualization across bags */
function FungalNetwork({
  bagPositions,
  connections,
  visible,
}: {
  bagPositions: [number, number, number][]
  connections: [number, number][]
  visible: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!groupRef.current || !visible) return
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh
      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.2 + Math.sin(Date.now() * 0.001 + i * 0.7) * 0.15
    })
  })

  if (!visible) return null

  // Generate hyphae paths — 1 thread per connection + 2 roots per bag (reduced for perf)
  const hyphae = useMemo(() => {
    const paths: { points: THREE.Vector3[]; thickness: number }[] = []
    for (const [fromIdx, toIdx] of connections) {
      const from = bagPositions[fromIdx]
      const to = bagPositions[toIdx]
      const dir = new THREE.Vector3(to[0] - from[0], 0, to[2] - from[2]).normalize()
      const pts = [
        new THREE.Vector3(from[0] + dir.x * 0.48, -0.08, from[2] + dir.z * 0.48),
        new THREE.Vector3(
          (from[0] + to[0]) * 0.5,
          -0.05 + Math.sin(fromIdx) * 0.04,
          (from[2] + to[2]) * 0.5
        ),
        new THREE.Vector3(to[0] - dir.x * 0.48, -0.08, to[2] - dir.z * 0.48),
      ]
      paths.push({ points: pts, thickness: 0.008 })
    }
    // Internal root colonization (2 per bag instead of 4)
    bagPositions.forEach(pos => {
      for (let r = 0; r < 2; r++) {
        const angle = r * Math.PI
        const pts = [
          new THREE.Vector3(pos[0], -0.2, pos[2]),
          new THREE.Vector3(pos[0] + Math.cos(angle) * 0.25, -0.05, pos[2] + Math.sin(angle) * 0.25),
        ]
        paths.push({ points: pts, thickness: 0.006 })
      }
    })
    return paths
  }, [bagPositions, connections])

  // Pre-build curves so they aren't recreated in render
  const curves = useMemo(
    () => hyphae.map(h => new THREE.CatmullRomCurve3(h.points)),
    [hyphae]
  )

  return (
    <group ref={groupRef}>
      {curves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 8, hyphae[i].thickness, 4, false]} />
          <meshStandardMaterial
            color="#a855f7"
            emissive="#7c3aed"
            emissiveIntensity={0.3}
            transparent
            opacity={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

/** Floor / ground plane */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]} receiveShadow>
      <planeGeometry args={[20, 18]} />
      <meshStandardMaterial color="#2a2a3e" roughness={0.9} />
    </mesh>
  )
}

// ---------------------------------------------------------------------------
// Main Scene
// ---------------------------------------------------------------------------

function Scene({
  bag1Data,
  bag6Data,
  selectedBag,
  onBagClick,
  lightingLevel,
  showFungalNetwork,
  showWaterFlow,
  pawActive,
}: DigitalTwinSceneProps) {
  // 18 bags in 3-row serpentine layout
  const bagPositions: [number, number, number][] = useMemo(
    () => [
      // Front row (left → right)
      [-3.75, 0, 1.8],
      [-2.25, 0, 1.8],
      [-0.75, 0, 1.8],
      [0.75, 0, 1.8],
      [2.25, 0, 1.8],
      [3.75, 0, 1.8],
      // Middle row (right → left)
      [3.75, 0, 0],
      [2.25, 0, 0],
      [0.75, 0, 0],
      [-0.75, 0, 0],
      [-2.25, 0, 0],
      [-3.75, 0, 0],
      // Back row (left → right)
      [-3.75, 0, -1.8],
      [-2.25, 0, -1.8],
      [-0.75, 0, -1.8],
      [0.75, 0, -1.8],
      [2.25, 0, -1.8],
      [3.75, 0, -1.8],
    ],
    []
  )

  const bagIds = [
    "grow-bag-1", "grow-bag-2", "grow-bag-3", "grow-bag-4", "grow-bag-5", "grow-bag-6",
    "grow-bag-7", "grow-bag-8", "grow-bag-9", "grow-bag-10", "grow-bag-11", "grow-bag-12",
    "grow-bag-13", "grow-bag-14", "grow-bag-15", "grow-bag-16", "grow-bag-17", "grow-bag-18",
  ]

  // Connections: serpentine rows + cross-row column links
  const connections: [number, number][] = useMemo(() => [
    // Row connections (horizontal)
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],          // Front row
    [6, 7], [7, 8], [8, 9], [9, 10], [10, 11],       // Middle row
    [12, 13], [13, 14], [14, 15], [15, 16], [16, 17], // Back row
    // Column connections (front ↔ middle ↔ back)
    [0, 11], [1, 10], [2, 9], [3, 8], [4, 7], [5, 6],   // Front ↔ Middle
    [11, 12], [10, 13], [9, 14], [8, 15], [7, 16], [6, 17], // Middle ↔ Back
  ], [])

  return (
    <>
      {/* Lighting — bright studio setup */}
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-4, 6, -4]} intensity={0.7} />
      <directionalLight position={[0, 4, 8]} intensity={0.4} />
      <hemisphereLight args={['#b1e1ff', '#1a1a2e', 0.5]} />

      <Floor />
      <GrowTable />

      {/* LED Panel */}
      <LEDPanel intensity={lightingLevel} />

      {/* Grow Bags */}
      {bagPositions.map((pos, i) => {
        const bagId = bagIds[i]
        const hasSensor = i === 0 || i === 5
        const sensorData =
          i === 0 ? bag1Data : i === 5 ? bag6Data : undefined

        return (
          <GrowBag
            key={bagId}
            position={pos}
            bagId={bagId}
            hasSensor={hasSensor}
            sensorData={sensorData}
            isSelected={selectedBag === bagId}
            onClick={() => onBagClick(bagId)}
          />
        )
      })}

      {/* CMN Cartridges (connecting adjacent bags in rectangle) */}
      {connections.map(([fromIdx, toIdx], i) => (
        <CMNCartridge
          key={i}
          from={bagPositions[fromIdx]}
          to={bagPositions[toIdx]}
          showFungalNetwork={showFungalNetwork}
        />
      ))}

      {/* Fungal network */}
      <FungalNetwork bagPositions={bagPositions} connections={connections} visible={showFungalNetwork} />

      {/* Drip irrigation */}
      <DripLine bagPositions={bagPositions} />
      <WaterFlow
        bagPositions={bagPositions}
        active={showWaterFlow && bag1Data.nutrientPumpOn}
        isPAW={false}
      />
      <WaterFlow
        bagPositions={bagPositions}
        active={showWaterFlow && bag1Data.pawPumpOn}
        isPAW={true}
      />

      {/* Pumps */}
      <PumpUnit
        position={[-5.5, -0.4, 0.8]}
        label="Nutrition P19"
        color="#22c55e"
        isOn={bag1Data.nutrientPumpOn}
      />
      <PumpUnit
        position={[-5.5, -0.4, -0.8]}
        label="PAW P22"
        color="#a855f7"
        isOn={bag1Data.pawPumpOn}
      />

      {/* Reservoir tanks */}
      <ReservoirTank
        position={[-6.5, -0.3, 0.8]}
        label="Nutrient Solution"
        color="#22c55e"
        level={0.7}
      />
      <ReservoirTank
        position={[-6.5, -0.3, -0.8]}
        label="PAW (H₂O₂)"
        color="#a855f7"
        level={0.5}
      />

      {/* Sensor HUDs removed — now rendered as DOM overlay outside Canvas */}

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={20}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0.3, 0]}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Exported Canvas wrapper
// ---------------------------------------------------------------------------

/** Sensor data overlay rendered as plain DOM on top of the canvas */
function SensorOverlay({ data, bagId }: { data: SensorValues; bagId: string }) {
  const bagNum = bagId.replace('grow-bag-', '')
  return (
    <div style={{
      position: 'absolute',
      top: '12px',
      right: '12px',
      background: 'rgba(10,10,26,0.92)',
      border: '1px solid #22d3ee',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: 'monospace',
      color: '#94a3b8',
      fontSize: '12px',
      lineHeight: '1.7',
      minWidth: '170px',
      boxShadow: '0 0 16px rgba(34,211,238,0.25)',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      <div style={{ color: '#22d3ee', fontWeight: 'bold', marginBottom: '4px', fontSize: '13px', letterSpacing: '1px' }}>
        BAG {bagNum} — LIVE DATA
      </div>
      <div>pH: <span style={{ color: '#' + phToColor(data.pH).getHexString() }}>{data.pH.toFixed(1)}</span> {data.pH >= 5.5 && data.pH <= 6.5 ? '✓' : '⚠'}</div>
      <div>EC: {data.ec.toFixed(2)} mS/cm</div>
      <div>Temp: {data.temperature.toFixed(1)}°C</div>
      <div>Moist: {data.moisture.toFixed(0)}%</div>
      <div>RH: {data.humidity.toFixed(0)}%</div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '11px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: data.nutrientPumpOn ? '#22c55e' : '#ef4444', boxShadow: data.nutrientPumpOn ? '0 0 6px #22c55e' : 'none' }} />
          NUT
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: data.pawPumpOn ? '#a855f7' : '#ef4444', boxShadow: data.pawPumpOn ? '0 0 6px #a855f7' : 'none' }} />
          PAW
        </span>
      </div>
    </div>
  )
}

export default function DigitalTwinCanvas({
  bag1Data,
  bag6Data,
  selectedBag,
  onBagClick,
  lightingLevel,
  showFungalNetwork,
  showWaterFlow,
  pawActive,
}: DigitalTwinSceneProps) {
  // Determine which sensor data to show in the overlay
  const overlayData = selectedBag === 'grow-bag-1' ? bag1Data
    : selectedBag === 'grow-bag-6' ? bag6Data
    : null

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {overlayData && <SensorOverlay data={overlayData} bagId={selectedBag} />}
      <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [8, 6, 9], fov: 50, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: true,
      }}
      style={{ background: "#12122a" }}
      onCreated={({ gl }) => {
        gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
        const canvas = gl.domElement
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          console.warn('[DigitalTwin] WebGL context lost — attempting recovery')
        })
        canvas.addEventListener('webglcontextrestored', () => {
          console.log('[DigitalTwin] WebGL context restored')
        })
      }}
    >
      <Scene
        bag1Data={bag1Data}
        bag6Data={bag6Data}
        selectedBag={selectedBag}
        onBagClick={onBagClick}
        lightingLevel={lightingLevel}
        showFungalNetwork={showFungalNetwork}
        showWaterFlow={showWaterFlow}
        pawActive={pawActive}
      />
    </Canvas>
    </div>
  )
}
