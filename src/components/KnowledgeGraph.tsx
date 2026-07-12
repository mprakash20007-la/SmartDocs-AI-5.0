import React, { useState, useEffect, useRef } from 'react';
import { Network, HelpCircle, User, Star, BookOpen } from 'lucide-react';
import GlassCard from './GlassCard';

interface GraphNode {
  id: string;
  label: string;
  type: 'topic' | 'concept' | 'definition' | 'technology' | 'person';
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
}

interface KnowledgeGraphProps {
  graphData: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  title?: string;
  onNodeClick?: (node: GraphNode) => void;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  graphData,
  title = "Document Knowledge Graph",
  onNodeClick
}) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const dragNodeRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [repulsion, setRepulsion] = useState(300);
  const [linkForce, setLinkForce] = useState(0.05);
  const [gravity, setGravity] = useState(0.02);

  const width = 800;
  const height = 450;

  // Initialize nodes with random layout around the center, avoiding resets if nodes are identical
  useEffect(() => {
    if (!graphData.nodes || graphData.nodes.length === 0) {
      setNodes([]);
      return;
    }
    
    const currentIds = nodes.map(n => n.id).sort().join(',');
    const newIds = graphData.nodes.map(n => n.id).sort().join(',');

    if (currentIds === newIds && nodes.length > 0) {
      return; // Do not reset if coordinates exist and ids are identical
    }
    
    const initializedNodes = graphData.nodes.map((node) => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 150,
      y: height / 2 + (Math.random() - 0.5) * 150,
      vx: 0,
      vy: 0
    }));
    
    setNodes(initializedNodes);
    setSelectedNode(initializedNodes[0] || null);
  }, [graphData.nodes]);

  // physics force-directed layout simulation loop
  useEffect(() => {
    if (nodes.length === 0) return;

    let animationId: number;

    const simulate = () => {
      setNodes((currentNodes) => {
        // Create a deep-ish copy to compute forces
        const updated = currentNodes.map(n => ({ ...n }));

        const damping = 0.85;

        // 1. Repulsion between all nodes (prevent overlapping)
        for (let i = 0; i < updated.length; i++) {
          for (let j = i + 1; j < updated.length; j++) {
            const n1 = updated[i];
            const n2 = updated[j];
            
            const dx = n2.x! - n1.x!;
            const dy = n2.y! - n1.y!;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            if (distance < 150) {
              const force = (repulsion / (distance * distance));
              const fx = (dx / distance) * force;
              const fy = (dy / distance) * force;
              
              if (n1.id !== dragNodeRef.current) {
                n1.vx! -= fx;
                n1.vy! -= fy;
              }
              if (n2.id !== dragNodeRef.current) {
                n2.vx! += fx;
                n2.vy! += fy;
              }
            }
          }
        }

        // 2. Link Attraction between connected nodes
        graphData.edges.forEach((edge) => {
          const sourceNode = updated.find(n => n.id === edge.from);
          const targetNode = updated.find(n => n.id === edge.to);
          
          if (sourceNode && targetNode) {
            const dx = targetNode.x! - sourceNode.x!;
            const dy = targetNode.y! - sourceNode.y!;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Optimal link distance: ~80px
            const desiredLength = 80;
            const displacement = distance - desiredLength;
            const force = displacement * linkForce;
            
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;
            
            if (sourceNode.id !== dragNodeRef.current) {
              sourceNode.vx! += fx;
              sourceNode.vy! += fy;
            }
            if (targetNode.id !== dragNodeRef.current) {
              targetNode.vx! -= fx;
              targetNode.vy! -= fy;
            }
          }
        });

        // 3. Gravity pulling to the center of SVG & applying velocity
        updated.forEach((node) => {
          if (node.id === dragNodeRef.current) return;

          // Pull to center
          const cx = width / 2;
          const cy = height / 2;
          node.vx! += (cx - node.x!) * gravity;
          node.vy! += (cy - node.y!) * gravity;

          // Apply velocity and damping
          node.x! += node.vx!;
          node.y! += node.vy!;
          node.vx! *= damping;
          node.vy! *= damping;

          // Keep nodes inside boundaries
          node.x = Math.max(20, Math.min(width - 20, node.x!));
          node.y = Math.max(20, Math.min(height - 20, node.y!));
        });

        return updated;
      });

      animationId = requestAnimationFrame(simulate);
    };

    animationId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationId);
  }, [nodes.length, graphData.edges, repulsion, linkForce, gravity]);

  // Handlers for dragging nodes
  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    dragNodeRef.current = nodeId;
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragNodeRef.current || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === dragNodeRef.current ? { ...node, x, y, vx: 0, vy: 0 } : node
      )
    );
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'topic': return '#a855f7'; // brand purple
      case 'concept': return '#22d3ee'; // brand cyan
      case 'definition': return '#facc15'; // yellow
      case 'technology': return '#60a5fa'; // light blue
      case 'person': return '#34d399'; // green
      default: return '#94a3b8'; // slate
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'topic': return <Network className="w-4 h-4 text-brand-purple" />;
      case 'concept': return <Star className="w-4 h-4 text-brand-cyan" />;
      case 'definition': return <BookOpen className="w-4 h-4 text-yellow-400" />;
      case 'person': return <User className="w-4 h-4 text-green-400" />;
      default: return <HelpCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="knowledge-graph-view">
      {/* Graph Area */}
      <div className="lg:col-span-3">
        <GlassCard className="p-4 relative">
          <div className="absolute top-4 left-4 z-10">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">Drag nodes to reorganize concepts and understand connections</p>
          </div>

          <svg
            ref={svgRef}
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="rounded-xl overflow-hidden bg-black/40 border border-white/5 cursor-grab active:cursor-grabbing"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Draw Relationship Lines / Edges */}
            {graphData.edges.map((edge, idx) => {
              const source = nodes.find(n => n.id === edge.from);
              const target = nodes.find(n => n.id === edge.to);
              
              if (!source || !target) return null;
              
              return (
                <g key={`edge-${idx}`}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1.5"
                  />
                  {/* Small relationship tag visible on hover */}
                  {(hoveredNode?.id === edge.from || hoveredNode?.id === edge.to) && (
                    <text
                      x={(source.x! + target.x!) / 2}
                      y={(source.y! + target.y!) / 2 - 4}
                      fill="rgba(34, 211, 238, 0.8)"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="bg-black/80"
                    >
                      {edge.relation}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Draw Nodes */}
            {nodes.map((node) => {
              const color = getNodeColor(node.type);
              const isSelected = selectedNode?.id === node.id;
              
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onClick={() => setSelectedNode(node)}
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-pointer group"
                >
                  {/* Glowing halo */}
                  <circle
                    r={isSelected ? 18 : 12}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={isSelected ? '3' : '1'}
                    className="opacity-40 group-hover:scale-110 transition-transform"
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                  />
                  <circle
                    r={isSelected ? 10 : 8}
                    fill={color}
                    className="opacity-80"
                  />
                  <text
                    y={isSelected ? 30 : 22}
                    fill={isSelected ? '#ffffff' : '#94a3b8'}
                    fontSize={isSelected ? '11' : '9'}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                    className="pointer-events-none drop-shadow-md select-none font-bold"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </GlassCard>
      </div>

      {/* Detail Panel */}
      <div>
        <GlassCard className="h-full space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-white/5">
            <Network className="w-5 h-5 text-brand-purple" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Concept Details</h4>
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10" style={{ color: getNodeColor(selectedNode.type) }}>
                  {selectedNode.type}
                </span>
                <h3 className="text-lg font-black text-white">{selectedNode.label}</h3>
              </div>

              {/* Connections list */}
              <div className="space-y-3 pt-2">
                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Connected Relations</div>
                
                <div className="space-y-2">
                  {graphData.edges
                    .filter(edge => edge.from === selectedNode.id || edge.to === selectedNode.id)
                    .map((edge, idx) => {
                      const otherId = edge.from === selectedNode.id ? edge.to : edge.from;
                      const otherNode = nodes.find(n => n.id === otherId);
                      if (!otherNode) return null;

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedNode(otherNode)}
                          className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-all cursor-pointer flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] text-gray-400 block font-semibold">{edge.relation}</span>
                            <span className="text-xs font-bold text-white truncate block">{otherNode.label}</span>
                          </div>
                          {getNodeIcon(otherNode.type)}
                        </div>
                      );
                    })}
                  
                  {graphData.edges.filter(edge => edge.from === selectedNode.id || edge.to === selectedNode.id).length === 0 && (
                    <p className="text-xs text-gray-500">No active relations found for this concept.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-gray-500">
              Select a node in the graph to inspect connections and terminology.
            </div>
          )}

          {/* Force Control Physics Sliders */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Graph Physics Engine</div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Repulsion (Node Spacing)</span>
                <span className="font-bold text-white">{repulsion}</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                step="10"
                value={repulsion}
                onChange={(e) => setRepulsion(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-purple"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Link Attraction</span>
                <span className="font-bold text-white">{linkForce.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.2"
                step="0.005"
                value={linkForce}
                onChange={(e) => setLinkForce(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Gravity Pull</span>
                <span className="font-bold text-white">{gravity.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.08"
                step="0.002"
                value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-400"
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
export default KnowledgeGraph;
