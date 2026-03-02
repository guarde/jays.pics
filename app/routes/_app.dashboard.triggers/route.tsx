import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  json,
  redirect,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { GitBranch, Save, Tag, Type } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
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

  function handleDelete() {
    if (!contextMenu) return;
    const id = contextMenu.nodeId;
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

  const selectedAction = selectedNode
    ? ACTION_COMPONENTS[selectedNode.data.actionType]
    : null;
  const selectedMeta = selectedNode
    ? ACTION_META[selectedNode.data.actionType]
    : null;

  return (
    <div className="p-8 space-y-4">
      {/* Header */}
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

      {/* Editor */}
      <div className="flex h-[600px] border border-border rounded-lg overflow-hidden">
        {/* Action palette */}
        <aside
          className="w-52 border-r border-border bg-card p-3 space-y-2 shrink-0 overflow-y-auto"
          onDragOver={onDragOver}
        >
          <p className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
              <Background color="hsl(var(--border))" />
              <Controls />
            </ReactFlow>
          </ReactFlowProvider>

          {/* Context menu */}
          {contextMenu && (
            <div
              className="absolute z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden py-1 min-w-[140px]"
              style={{ top: contextMenu.y - 40, left: contextMenu.x - 20 }}
            >
              <button
                className="block px-4 py-2 w-full text-left text-sm hover:bg-accent/50 text-destructive hover:text-destructive transition-colors"
                onClick={handleDelete}
              >
                Delete node
              </button>
            </div>
          )}
        </div>

        {/* Config panel */}
        {selectedNode && (
          <aside className="w-72 border-l border-border bg-card shrink-0 overflow-y-auto">
            <div className="px-4 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Configure Action
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {selectedMeta?.icon && (
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <selectedMeta.icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                )}
                <p className="text-sm font-semibold">
                  {selectedMeta?.label ?? selectedNode.data.actionType}
                </p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {selectedAction && (
                <selectedAction
                  data={selectedNode.data}
                  update={updateSelected}
                />
              )}
              <button
                type="button"
                className="text-xs text-destructive hover:underline mt-2"
                onClick={() => {
                  const id = selectedNode.id;
                  setNodes((nds) => nds.filter((n) => n.id !== id));
                  setEdges((eds) =>
                    eds.filter((e) => e.source !== id && e.target !== id),
                  );
                  setSelectedNode(null);
                }}
              >
                Remove this action
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
