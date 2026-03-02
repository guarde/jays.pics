import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { GitBranch, Save, Tag, Trash2, Type } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { prisma } from "~/services/database.server";
import { getSession, getUserBySession } from "~/services/session.server";

import AddTagAction from "./triggers/add_tag";
import RenameAction from "./triggers/rename";

const ACTION_COMPONENTS: Record<
  string,
  React.FC<{ data: any; update: (d: any) => void }>
> = {
  add_tag: AddTagAction,
  rename: RenameAction,
};

const ACTION_META: Record<
  string,
  { label: string; description: string; icon: React.ElementType }
> = {
  add_tag: {
    label: "Add Tag",
    description: "Tag the image with a label",
    icon: Tag,
  },
  rename: {
    label: "Rename",
    description: "Set a custom display name",
    icon: Type,
  },
};

const AVAILABLE_ACTIONS = Object.keys(ACTION_COMPONENTS);

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/");
  const user = await getUserBySession(session);
  if (!user) return redirect("/");

  const trigger = await prisma.trigger.findFirst({
    where: { user_id: user.id, type: "image_upload" },
    include: { actions: true },
  });

  return json({ trigger });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  if (!session.has("userID")) return redirect("/");
  const user = await getUserBySession(session);
  if (!user) return redirect("/");

  const data = await request.json();
  if (!Array.isArray(data.actions)) return json({ ok: false }, { status: 400 });

  const existing = await prisma.trigger.findFirst({
    where: { user_id: user.id, type: "image_upload" },
    include: { actions: true },
  });
  if (existing) {
    await prisma.triggerAction.deleteMany({
      where: { trigger_id: existing.id },
    });
    await prisma.trigger.delete({ where: { id: existing.id } });
  }

  const trigger = await prisma.trigger.create({
    data: { user_id: user.id, type: "image_upload", name: "Image Uploaded" },
  });

  for (const a of data.actions) {
    await prisma.triggerAction.create({
      data: {
        trigger_id: trigger.id,
        type: a.type,
        data: a.data,
      },
    });
  }

  return json({ ok: true });
}

// Custom ReactFlow styles injected as a style tag to override defaults
const FLOW_STYLES = `
  .react-flow__node {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    color: hsl(var(--foreground));
    font-size: 12px;
    font-family: inherit;
    padding: 8px 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .react-flow__node.selected,
  .react-flow__node:focus {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 1px hsl(var(--primary));
  }
  .react-flow__node-input {
    background: hsl(var(--primary) / 0.15);
    border-color: hsl(var(--primary) / 0.5);
  }
  .react-flow__handle {
    background: hsl(var(--primary));
    border: 2px solid hsl(var(--background));
    width: 8px;
    height: 8px;
  }
  .react-flow__edge-path {
    stroke: hsl(var(--primary) / 0.6);
    stroke-width: 2;
  }
  .react-flow__edge.selected .react-flow__edge-path {
    stroke: hsl(var(--primary));
  }
  .react-flow__controls {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 8px;
    overflow: hidden;
    box-shadow: none;
  }
  .react-flow__controls-button {
    background: hsl(var(--card));
    border: none;
    border-bottom: 1px solid hsl(var(--border));
    color: hsl(var(--muted-foreground));
    fill: hsl(var(--muted-foreground));
    width: 28px;
    height: 28px;
  }
  .react-flow__controls-button:hover {
    background: hsl(var(--accent) / 0.5);
    color: hsl(var(--foreground));
    fill: hsl(var(--foreground));
  }
  .react-flow__controls-button:last-child {
    border-bottom: none;
  }
  .react-flow__attribution {
    display: none;
  }
`;

export default function Triggers() {
  const { trigger } = useLoaderData<typeof loader>();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const initialNodes = useMemo<Node[]>(() => {
    const nodes: Node[] = [
      {
        id: "trigger",
        type: "input",
        position: { x: 0, y: 0 },
        data: { label: "Image Uploaded" },
      },
    ];
    if (trigger) {
      trigger.actions.forEach((a, i) => {
        nodes.push({
          id: `a${i}`,
          position: { x: 250, y: i * 100 },
          data: {
            label: ACTION_META[a.type]?.label ?? a.type,
            actionType: a.type,
            ...(a.data as Record<string, unknown>),
          },
        });
      });
    }
    return nodes;
  }, [trigger]);

  const initialEdges = useMemo<Edge[]>(() => {
    if (!trigger) return [];
    return trigger.actions.map((_, i) => ({
      id: `e${i}`,
      source: "trigger",
      target: `a${i}`,
    }));
  }, [trigger]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);

  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type || !reactFlowInstance) return;

      const rect = reactFlowWrapper.current!.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      const id = `${type}_${nodes.length}`;
      const newNode: Node = {
        id,
        position,
        data: { label: ACTION_META[type]?.label ?? type, actionType: type },
      };
      setNodes((nds) => nds.concat(newNode));
      setEdges((eds) =>
        eds.concat({ id: `e_${id}`, source: "trigger", target: id }),
      );
      setSelectedNode(newNode);
    },
    [reactFlowInstance, nodes.length, setEdges, setNodes],
  );

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id === "trigger") return;
    setSelectedNode(node);
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (node.id === "trigger") return;
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [],
  );

  function updateSelected(data: Record<string, unknown>) {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    );
    setSelectedNode((n) => (n ? { ...n, data: { ...n.data, ...data } } : n));
  }

  function handleDelete(nodeId?: string) {
    const id = nodeId ?? contextMenu?.nodeId;
    if (!id) return;
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    if (selectedNode?.id === id) setSelectedNode(null);
    setContextMenu(null);
  }

  async function handleSave() {
    const actions = nodes
      .filter((n) => n.id !== "trigger")
      .map((n) => ({ type: n.data.actionType, data: { ...n.data } }));

    await fetch("/dashboard/triggers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions }),
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Capitalised so React treats it as a component, not a DOM element
  const SelectedActionComponent = selectedNode
    ? ACTION_COMPONENTS[selectedNode.data.actionType]
    : null;
  const selectedMeta = selectedNode
    ? ACTION_META[selectedNode.data.actionType]
    : null;
  const SelectedMetaIcon = selectedMeta?.icon ?? null;

  return (
    <div className="flex flex-col h-full">
      <style dangerouslySetInnerHTML={{ __html: FLOW_STYLES }} />

      {/* Header */}
      <div className="border-b border-border px-8 py-5 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <GitBranch className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Triggers</h1>
              <Badge variant="secondary" className="text-xs">
                BETA
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Automate actions when images are uploaded
            </p>
          </div>
          <Button onClick={handleSave} size="sm" className="gap-2 text-white">
            <Save className="h-3.5 w-3.5" />
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
      </div>

      {/* Editor — fills remaining height */}
      <div className="flex flex-1 overflow-hidden">
        {/* Action palette */}
        <aside
          className="w-52 border-r border-border bg-card p-3 space-y-2 shrink-0 overflow-y-auto"
          onDragOver={onDragOver}
        >
          <p className="px-1 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">
            Actions
          </p>
          {AVAILABLE_ACTIONS.map((type) => {
            const meta = ACTION_META[type];
            const Icon = meta?.icon ?? GitBranch;
            return (
              <div
                key={type}
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background cursor-grab hover:border-primary/40 hover:bg-primary/5 transition-colors active:cursor-grabbing select-none"
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("application/reactflow", type)
                }
              >
                <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold leading-none mb-0.5">
                    {meta?.label ?? type}
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {meta?.description ?? ""}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="pt-3 text-xs text-muted-foreground px-1">
            Drag actions onto the canvas, then connect them to the trigger.
          </div>
        </aside>

        {/* Flow canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              onInit={setReactFlowInstance}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={() => setContextMenu(null)}
              fitView
            >
              <Background
                color="hsl(var(--border))"
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
              />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>

          {/* Right-click context menu */}
          {contextMenu && (
            <div
              className="absolute z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden py-1 min-w-[140px]"
              style={{ top: contextMenu.y - 40, left: contextMenu.x - 20 }}
            >
              <button
                className="flex items-center gap-2 px-4 py-2 w-full text-left text-sm hover:bg-accent/50 text-destructive hover:text-destructive transition-colors"
                onClick={() => handleDelete(contextMenu.nodeId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete node
              </button>
            </div>
          )}
        </div>

        {/* Config panel — shown when a node is selected */}
        {selectedNode && (
          <aside className="w-72 border-l border-border bg-card shrink-0 overflow-y-auto">
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                Configure Action
              </p>
              <div className="flex items-center gap-2">
                {SelectedMetaIcon && (
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <SelectedMetaIcon className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <p className="text-sm font-semibold">
                  {selectedMeta?.label ?? selectedNode.data.actionType}
                </p>
              </div>
              {selectedMeta?.description && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedMeta.description}
                </p>
              )}
            </div>
            <div className="p-4 space-y-4">
              {SelectedActionComponent && (
                <SelectedActionComponent
                  data={selectedNode.data}
                  update={updateSelected}
                />
              )}
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
                onClick={() => handleDelete(selectedNode.id)}
              >
                <Trash2 className="h-3 w-3" />
                Remove this action
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
