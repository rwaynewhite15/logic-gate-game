import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Trash2, Zap } from 'lucide-react';

const LogicGateGame = () => {
  const canvasRef = useRef(null);
  const [components, setComponents] = useState([]);
  const [wires, setWires] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [gridSize] = useState(20);

  // Component types with their properties
  const componentTypes = {
    INPUT: { name: 'Input', color: '#10b981', inputs: 0, outputs: 1 },
    OUTPUT: { name: 'Output', color: '#ef4444', inputs: 1, outputs: 0 },
    NOT: { name: 'NOT', color: '#3b82f6', inputs: 1, outputs: 1 },
    AND: { name: 'AND', color: '#8b5cf6', inputs: 2, outputs: 1 },
    OR: { name: 'OR', color: '#f59e0b', inputs: 2, outputs: 1 },
    NAND: { name: 'NAND', color: '#ec4899', inputs: 2, outputs: 1 },
    NOR: { name: 'NOR', color: '#14b8a6', inputs: 2, outputs: 1 },
    XOR: { name: 'XOR', color: '#f97316', inputs: 2, outputs: 1 },
  };

  // Simulate logic gates
  const simulateGate = (type, inputs) => {
    switch (type) {
      case 'INPUT': return inputs[0] || false;
      case 'NOT': return !inputs[0];
      case 'AND': return inputs.every(i => i);
      case 'OR': return inputs.some(i => i);
      case 'NAND': return !inputs.every(i => i);
      case 'NOR': return !inputs.some(i => i);
      case 'XOR': return inputs.filter(i => i).length === 1;
      case 'OUTPUT': return inputs[0] || false;
      default: return false;
    }
  };

  // Run simulation
  const runSimulation = () => {
    const newComponents = [...components];
    const maxIterations = 100;
    let iterations = 0;
    let changed = true;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      newComponents.forEach(comp => {
        if (comp.type === 'INPUT') return;

        const inputValues = [];
        const inputWires = wires.filter(w => w.to === comp.id);

        for (let i = 0; i < componentTypes[comp.type].inputs; i++) {
          const wire = inputWires.find(w => w.toPin === i);
          if (wire) {
            const sourceComp = newComponents.find(c => c.id === wire.from);
            inputValues.push(sourceComp?.state || false);
          } else {
            inputValues.push(false);
          }
        }

        const newState = simulateGate(comp.type, inputValues);
        if (newState !== comp.state) {
          comp.state = newState;
          changed = true;
        }
      });
    }

    setComponents(newComponents);
  };

  useEffect(() => {
    if (simulating) {
      const interval = setInterval(runSimulation, 100);
      return () => clearInterval(interval);
    }
  }, [simulating, components, wires]);

  // Get pin position
  const getOutputPinPos = (comp) => ({
    x: comp.x + 60,
    y: comp.y + 25
  });

  const getInputPinPos = (comp, pinIndex) => ({
    x: comp.x,
    y: comp.y + 15 + pinIndex * 20
  });

  // Check if point is near a pin
  const isNearPin = (x, y, pinX, pinY, threshold = 15) => {
    const dx = x - pinX;
    const dy = y - pinY;
    return Math.sqrt(dx * dx + dy * dy) < threshold;
  };

  // Drawing on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw wires
    wires.forEach(wire => {
      const fromComp = components.find(c => c.id === wire.from);
      const toComp = components.find(c => c.id === wire.to);
      if (!fromComp || !toComp) return;

      const fromPos = getOutputPinPos(fromComp);
      const toPos = getInputPinPos(toComp, wire.toPin);

      ctx.strokeStyle = fromComp.state ? '#10b981' : '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fromPos.x, fromPos.y);
      ctx.bezierCurveTo(
        fromPos.x + 50, fromPos.y,
        toPos.x - 50, toPos.y,
        toPos.x, toPos.y
      );
      ctx.stroke();

      // Draw connection points
      ctx.fillStyle = fromComp.state ? '#10b981' : '#64748b';
      ctx.beginPath();
      ctx.arc(fromPos.x, fromPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(toPos.x, toPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw components
    components.forEach(comp => {
      const type = componentTypes[comp.type];
      
      // Component body
      ctx.fillStyle = comp.id === selectedComponent?.id ? '#475569' : '#334155';
      ctx.strokeStyle = type.color;
      ctx.lineWidth = 2;
      ctx.fillRect(comp.x, comp.y, 60, 50);
      ctx.strokeRect(comp.x, comp.y, 60, 50);

      // Component state indicator
      if (comp.state) {
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(comp.x + 30, comp.y + 25, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Component label
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(type.name, comp.x + 30, comp.y + 25);

      // Input pins (larger and more visible)
      for (let i = 0; i < type.inputs; i++) {
        const pos = getInputPinPos(comp, i);
        ctx.fillStyle = '#64748b';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Output pin (larger and more visible)
      if (type.outputs > 0) {
        const pos = getOutputPinPos(comp);
        ctx.fillStyle = comp.state ? '#10b981' : '#64748b';
        ctx.strokeStyle = comp.state ? '#34d399' : '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    // Draw connecting wire preview
    if (connecting) {
      const fromComp = components.find(c => c.id === connecting.from);
      if (fromComp) {
        const fromPos = getOutputPinPos(fromComp);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        ctx.lineTo(connecting.x, connecting.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Highlight nearby input pins
        components.forEach(comp => {
          if (comp.id === connecting.from) return;
          const type = componentTypes[comp.type];
          for (let i = 0; i < type.inputs; i++) {
            const pos = getInputPinPos(comp, i);
            if (isNearPin(connecting.x, connecting.y, pos.x, pos.y, 20)) {
              ctx.fillStyle = '#10b981';
              ctx.strokeStyle = '#34d399';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        });
      }
    }
  }, [components, wires, selectedComponent, connecting, gridSize]);

  const snapToGrid = (value) => Math.round(value / gridSize) * gridSize;

  const addComponent = (type) => {
    const newComp = {
      id: Date.now(),
      type,
      x: snapToGrid(100 + Math.random() * 200),
      y: snapToGrid(100 + Math.random() * 200),
      state: type === 'INPUT' ? false : false,
    };
    setComponents([...components, newComp]);
  };

  // Get coordinates from both mouse and touch events
  const getEventCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Handle both mouse and touch events
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault(); // Prevent default touch behavior
    const { x, y } = getEventCoordinates(e);

    // --- 1️⃣ Start connecting from output pin ---
    for (const comp of components) {
      const type = componentTypes[comp.type];
      if (type.outputs > 0) {
        const pos = getOutputPinPos(comp);
        if (isNearPin(x, y, pos.x, pos.y)) {
          setConnecting({ from: comp.id, x, y });
          setSelectedComponent(null);
          return;
        }
      }
    }

    // --- 2️⃣ Check if clicked on a component ---
    const clicked = components.find(
      c => x >= c.x && x <= c.x + 60 && y >= c.y && y <= c.y + 50
    );

    if (clicked) {
      setSelectedComponent(clicked);

      // Handle INPUT component special behavior
      if (clicked.type === "INPUT") {
        const centerX = clicked.x + 30;
        const centerY = clicked.y + 25;
        const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        // If click is near the center (inside ~15px radius), toggle state
        if (distToCenter < 15) {
          setComponents(components.map(c =>
            c.id === clicked.id ? { ...c, state: !c.state } : c
          ));
          return;
        } else {
          // Otherwise, start dragging if clicked near edges
          setDragging({
            id: clicked.id,
            offsetX: x - clicked.x,
            offsetY: y - clicked.y,
          });
          return;
        }
      }

      // Non-input components → always drag
      setDragging({
        id: clicked.id,
        offsetX: x - clicked.x,
        offsetY: y - clicked.y,
      });
    } else {
      setSelectedComponent(null);
    }
  };

  const handlePointerMove = (e) => {
    e.preventDefault(); // Prevent scrolling on mobile
    const { x, y } = getEventCoordinates(e);

    if (dragging) {
      setComponents(components.map(c => 
        c.id === dragging.id 
          ? { ...c, x: snapToGrid(x - dragging.offsetX), y: snapToGrid(y - dragging.offsetY) }
          : c
      ));
    } else if (connecting) {
      setConnecting({ ...connecting, x, y });
    }
  };

  const handlePointerUp = (e) => {
    if (connecting) {
      const { x, y } = getEventCoordinates(e);

      // Find if released near an input pin
      for (const comp of components) {
        if (comp.id === connecting.from) continue;
        const type = componentTypes[comp.type];
        for (let i = 0; i < type.inputs; i++) {
          const pos = getInputPinPos(comp, i);
          if (isNearPin(x, y, pos.x, pos.y, 20)) {
            // Check if wire already exists
            const wireExists = wires.some(w => 
              w.from === connecting.from && w.to === comp.id && w.toPin === i
            );
            if (!wireExists) {
              setWires([...wires, {
                from: connecting.from,
                to: comp.id,
                toPin: i,
              }]);
            }
            break;
          }
        }
      }
      setConnecting(null);
    }
    setDragging(null);
  };

  const deleteSelected = () => {
    if (!selectedComponent) return;
    setComponents(components.filter(c => c.id !== selectedComponent.id));
    setWires(wires.filter(w => w.from !== selectedComponent.id && w.to !== selectedComponent.id));
    setSelectedComponent(null);
  };

  const clearAll = () => {
    setComponents([]);
    setWires([]);
    setSelectedComponent(null);
    setSimulating(false);
  };

  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col">
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="text-blue-400" />
            <span className="hidden sm:inline">Logic Gate Computer Builder</span>
            <span className="sm:hidden">Logic Gates</span>
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setSimulating(!simulating)}
              className={`px-3 md:px-4 py-2 rounded flex items-center gap-2 text-sm md:text-base ${
                simulating ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              } text-white transition-colors`}
            >
              {simulating ? <><Pause size={16} /> Stop</> : <><Play size={16} /> Start</>}
            </button>
            <button
              onClick={deleteSelected}
              disabled={!selectedComponent}
              className="px-3 md:px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded flex items-center gap-2 transition-colors text-sm md:text-base"
            >
              <Trash2 size={16} /> <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={clearAll}
              className="px-3 md:px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors text-sm md:text-base"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Component Palette */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(componentTypes).map(([key, type]) => (
            <button
              key={key}
              onClick={() => addComponent(key)}
              className="px-3 py-2 rounded text-white font-medium transition-colors text-sm"
              style={{ backgroundColor: type.color }}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 text-xs md:text-sm text-slate-300">
        <p className="hidden md:block">
          <strong>Instructions:</strong> Click component buttons to add them • Click INPUT to toggle ON/OFF • 
          Drag components to move • <strong>Click and drag from OUTPUT pin (right side) to INPUT pin (left side)</strong> to connect • 
          Click component to select (then Delete) • Press Start to run
        </p>
        <p className="md:hidden">
          <strong>Mobile:</strong> Tap buttons to add • Tap INPUT center to toggle • 
          Drag components • <strong>Drag from right pin to left pin</strong> to wire • Tap to select
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs md:text-sm text-slate-300">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>Components: {components.length} | Wires: {wires.length}</div>
          <div className="text-xs">
            {simulating ? '🟢 Running' : '⚪ Paused'} | {connecting ? '🔵 Wiring' : selectedComponent ? '🟡 Selected' : '⚪ Ready'}
          </div>
          <div className="text-slate-400 text-xs hidden sm:block">
            Created by Robert • Made with Claude Sonnet 4.5
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicGateGame;