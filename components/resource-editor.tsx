"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react";
import { toast } from "sonner";
import type { ResourceClassification } from "@/lib/resources/model";

export interface EditableResource {
  id: string;
  description: string;
  classification: ResourceClassification;
}

type DraftState = Partial<Record<ResourceClassification, string>>;

const CLASSIFICATIONS: ResourceClassification[] = ["free", "paid"];
const SECTIONS = {
  free: {
    title: "Resurse gratis",
    example: "Exemple: mentorat, coaching sau o consultație de dezvoltare software de o oră.",
    border: "border-emerald-500/70",
    surface: "bg-emerald-950/20",
  },
  paid: {
    title: "Resurse contra cost",
    example: "Exemple: servicii de dezvoltare pentru aplicații mobile sau servicii de design interior.",
    border: "border-sky-500/70",
    surface: "bg-sky-950/20",
  },
} as const;

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function grow(event: React.FormEvent<HTMLTextAreaElement>) {
  event.currentTarget.style.height = "auto";
  event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
}

function categoryOf(resources: EditableResource[], id: string): ResourceClassification | null {
  if (id === "container-free") return "free";
  if (id === "container-paid") return "paid";
  return resources.find((resource) => resource.id === id)?.classification ?? null;
}

function grouped(resources: EditableResource[]) {
  return {
    free: resources.filter((resource) => resource.classification === "free"),
    paid: resources.filter((resource) => resource.classification === "paid"),
  };
}

function ResourceInput({ value, onChange, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={1}
      maxLength={255}
      value={value}
      onChange={(event) => {
        grow(event);
        onChange?.(event);
      }}
      className="min-h-11 w-full resize-none overflow-hidden rounded-lg border border-zinc-600 bg-zinc-950 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-white focus:ring-2 focus:ring-white/20"
    />
  );
}

function ResourceContainer({
  classification,
  children,
}: {
  classification: ResourceClassification;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `container-${classification}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 space-y-2 rounded-xl border bg-zinc-950/50 p-2 transition-colors ${isOver ? "border-white/70" : "border-zinc-700"}`}
      data-testid={`${classification}-resource-list`}
    >
      {children}
    </div>
  );
}

function SortableResourceRow({
  resource,
  section,
  editing,
  editValue,
  editError,
  menuOpen,
  onBeginEdit,
  onEditValue,
  onCommitEdit,
  onCancelEdit,
  onRemove,
  onToggleMenu,
  onMove,
  onReorder,
}: {
  resource: EditableResource;
  section: (typeof SECTIONS)[ResourceClassification];
  editing: boolean;
  editValue: string;
  editError: boolean;
  menuOpen: boolean;
  onBeginEdit: () => void;
  onEditValue: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  onToggleMenu: () => void;
  onMove: () => void;
  onReorder: (offset: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: resource.id,
    data: { classification: resource.classification },
  });
  const target = resource.classification === "free" ? "paid" : "free";
  const targetLabel = target === "free" ? "Mută la gratis" : "Mută la contra cost";

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    commit: () => void,
    cancel: () => void,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex w-full items-start gap-2 rounded-lg border px-2 py-2 ${section.border} ${section.surface} ${isDragging ? "z-10 opacity-70 shadow-xl" : ""}`}
    >
      <button
        type="button"
        aria-label={`Mută resursa ${resource.description}`}
        className="mt-0.5 grid size-8 shrink-0 touch-manipulation cursor-grab place-items-center rounded-md text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span aria-hidden className="text-lg leading-none">⠿</span>
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="w-full">
            <ResourceInput
              aria-label={`Editează ${resource.description}`}
              autoFocus
              value={editValue}
              onChange={(event) => onEditValue(event.target.value)}
              onKeyDown={(event) => handleKeyDown(event, onCommitEdit, onCancelEdit)}
            />
            <div className="mt-1 flex justify-between gap-2 text-xs">
              <span className="text-red-400" role="alert">
                {editError ? "Această resursă a fost deja adăugată." : ""}
              </span>
              <span className="font-mono text-zinc-400">{editValue.length}/255</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full whitespace-pre-wrap break-words py-1 text-left text-sm leading-5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={onBeginEdit}
          >
            {resource.description}
          </button>
        )}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          aria-label={`Acțiuni pentru ${resource.description}`}
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
          className="grid size-8 place-items-center rounded-md text-lg leading-none text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-20 w-48 rounded-lg border border-zinc-600 bg-zinc-900 p-1 shadow-xl">
            <button type="button" onClick={() => onReorder(-1)} className="w-full rounded px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Mută mai sus
            </button>
            <button type="button" onClick={() => onReorder(1)} className="w-full rounded px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Mută mai jos
            </button>
            <button type="button" onClick={onMove} className="w-full rounded px-3 py-2 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {targetLabel}
            </button>
            <button type="button" onClick={onRemove} className="w-full rounded px-3 py-2 text-left text-sm text-red-300 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              Elimină
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ResourceEditor({
  resources,
  onChange,
}: {
  resources: EditableResource[];
  onChange: (resources: EditableResource[]) => void;
}) {
  const [adding, setAdding] = useState<ResourceClassification | null>(null);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const dragStartResources = useRef<EditableResource[] | null>(null);
  const idPrefix = useId();
  const dndContextId = useId();
  const nextId = useRef(0);
  const resourcesRef = useRef(resources);
  useEffect(() => { resourcesRef.current = resources; }, [resources]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function duplicate(value: string, exceptId?: string) {
    const needle = normalized(value).toLocaleLowerCase("ro");
    return resources.some(
      (resource) => resource.id !== exceptId && normalized(resource.description).toLocaleLowerCase("ro") === needle,
    );
  }

  function commitAdd(classification: ResourceClassification) {
    const value = normalized(drafts[classification] ?? "");
    if (!value) return;
    if (duplicate(value)) {
      setErrorFor(`add-${classification}`);
      return;
    }
    onChange([...resources, { id: `${idPrefix}-${nextId.current++}`, description: value, classification }]);
    setDrafts((current) => ({ ...current, [classification]: "" }));
    setErrorFor(null);
    setAdding(null);
  }

  function commitEdit(id: string) {
    const value = normalized(editValue);
    if (!value || duplicate(value, id)) {
      if (duplicate(value, id)) setErrorFor(`edit-${id}`);
      return;
    }
    onChange(resources.map((resource) => resource.id === id ? { ...resource, description: value } : resource));
    setEditingId(null);
    setErrorFor(null);
  }

  function remove(resource: EditableResource) {
    const classificationRows = resources.filter((item) => item.classification === resource.classification);
    const position = classificationRows.findIndex((item) => item.id === resource.id);
    onChange(resources.filter((item) => item.id !== resource.id));
    setMenuFor(null);
    toast("Resursa a fost eliminată.", {
      duration: 5000,
      action: {
        label: "Anulează",
        onClick: () => {
          const current = resourcesRef.current.filter((item) => item.id !== resource.id);
          const same = current.filter((item) => item.classification === resource.classification);
          const before = same[position]?.id;
          const index = before ? current.findIndex((item) => item.id === before) : current.length;
          onChange([...current.slice(0, index), resource, ...current.slice(index)]);
        },
      },
    });
  }

  function moveResource(id: string, target: ResourceClassification, overId?: string) {
    const current = resourcesRef.current;
    const source = categoryOf(current, id);
    if (!source) return false;
    const groups = grouped(current);
    const sourceIndex = groups[source].findIndex((resource) => resource.id === id);
    if (sourceIndex < 0) return false;

    if (source !== target && groups[target].length >= 10) {
      toast.error(`Categoria ${target === "free" ? "gratis" : "contra cost"} poate conține cel mult 10 resurse.`);
      return false;
    }

    if (source === target) {
      const overIndex = overId ? groups[target].findIndex((resource) => resource.id === overId) : -1;
      if (overIndex < 0 || overIndex === sourceIndex) return true;
      groups[target] = arrayMove(groups[target], sourceIndex, overIndex);
    } else {
      const [moving] = groups[source].splice(sourceIndex, 1);
      const overIndex = overId ? groups[target].findIndex((resource) => resource.id === overId) : -1;
      groups[target].splice(overIndex < 0 ? groups[target].length : overIndex, 0, {
        ...moving,
        classification: target,
      });
    }
    const next = [...groups.free, ...groups.paid];
    resourcesRef.current = next;
    onChange(next);
    return true;
  }

  function handleDragStart() {
    dragStartResources.current = resourcesRef.current;
    setMenuFor(null);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const target = categoryOf(resourcesRef.current, String(over.id));
    const source = categoryOf(resourcesRef.current, String(active.id));
    if (target && source && target !== source) {
      moveResource(String(active.id), target, String(over.id));
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (over) {
      const target = categoryOf(resourcesRef.current, String(over.id));
      if (target) moveResource(String(active.id), target, String(over.id));
    }
    dragStartResources.current = null;
  }

  function handleDragCancel() {
    if (dragStartResources.current) onChange(dragStartResources.current);
    dragStartResources.current = null;
  }

  function handleInputKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    commit: () => void,
    cancel: () => void,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  }

  return (
    <DndContext
      id={dndContextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-6">
        {CLASSIFICATIONS.map((classification) => {
          const section = SECTIONS[classification];
          const rows = resources.filter((resource) => resource.classification === classification);
          const atLimit = rows.length >= 10;
          return (
            <section key={classification} aria-labelledby={`resources-${classification}`}>
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <h3 id={`resources-${classification}`} className="text-sm font-semibold text-white">{section.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">{section.example}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-zinc-500">{rows.length}/10</span>
              </div>
              <SortableContext items={rows.map((resource) => resource.id)} strategy={verticalListSortingStrategy}>
                <ResourceContainer classification={classification}>
                  {rows.map((resource) => (
                    <SortableResourceRow
                      key={resource.id}
                      resource={resource}
                      section={section}
                      editing={editingId === resource.id}
                      editValue={editValue}
                      editError={errorFor === `edit-${resource.id}`}
                      menuOpen={menuFor === resource.id}
                      onBeginEdit={() => { setEditingId(resource.id); setEditValue(resource.description); setErrorFor(null); setMenuFor(null); }}
                      onEditValue={(value) => { setEditValue(value); setErrorFor(null); }}
                      onCommitEdit={() => commitEdit(resource.id)}
                      onCancelEdit={() => { setEditingId(null); setErrorFor(null); }}
                      onRemove={() => remove(resource)}
                      onToggleMenu={() => setMenuFor((current) => current === resource.id ? null : resource.id)}
                      onMove={() => {
                        const target = resource.classification === "free" ? "paid" : "free";
                        if (moveResource(resource.id, target)) setMenuFor(null);
                      }}
                      onReorder={(offset) => {
                        const rows = resourcesRef.current.filter((item) => item.classification === resource.classification);
                        const index = rows.findIndex((item) => item.id === resource.id);
                        const target = rows[index + offset];
                        if (target) moveResource(resource.id, resource.classification, target.id);
                        setMenuFor(null);
                      }}
                    />
                  ))}
                </ResourceContainer>
              </SortableContext>

              {adding === classification ? (
                <div className="mt-2">
                  <div className="flex items-start gap-2">
                    <ResourceInput
                      aria-label={`Descrie resursa ${classification === "free" ? "gratis" : "contra cost"}`}
                      autoFocus
                      placeholder="Descrie resursa…"
                      value={drafts[classification] ?? ""}
                      onChange={(event) => { setDrafts((current) => ({ ...current, [classification]: event.target.value })); setErrorFor(null); }}
                      onKeyDown={(event) => handleInputKeyDown(event, () => commitAdd(classification), () => { setAdding(null); setErrorFor(null); })}
                    />
                    <button type="button" aria-label="Anulează adăugarea" onClick={() => { setAdding(null); setErrorFor(null); }}
                      className="grid size-11 shrink-0 place-items-center rounded-lg border border-zinc-600 text-xl text-zinc-300 hover:border-zinc-400 hover:text-white">×</button>
                  </div>
                  <div className="mt-1 flex justify-between gap-2 text-xs">
                    <span className="text-red-400" role="alert">{errorFor === `add-${classification}` ? "Această resursă a fost deja adăugată." : ""}</span>
                    <span className="font-mono text-zinc-400">{(drafts[classification] ?? "").length}/255</span>
                  </div>
                </div>
              ) : (
                <button type="button" disabled={atLimit} onClick={() => setAdding(classification)}
                  className="mt-2 text-sm font-semibold text-white underline decoration-zinc-600 underline-offset-4 hover:decoration-white disabled:cursor-not-allowed disabled:text-zinc-500 disabled:no-underline">
                  {atLimit ? "Limită atinsă · 10/10" : "Adaugă resursă"}
                </button>
              )}
            </section>
          );
        })}
      </div>
    </DndContext>
  );
}
