import { useMemo, useRef, useState } from "react";
import {
  closestCenter,
  CollisionDetection,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Database,
  FolderInput,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { UNGROUPED, useConfig } from "@/context/config";
import { Bucket, Group } from "@/models/types";
import { cn } from "@/lib/utils";
import { groupColor } from "@/lib/groupColors";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "../ui/menu";

/** Groups in order, and the connections of each group (or `UNGROUPED`) in order. */
type Layout = { groups: string[]; members: Record<string, string[]> };

// Drag ids: sortable groups, group header drop targets, sortable connections,
// and the ungrouped list as a drop target.
const groupKey = (id: string) => `g:${id}`;
const headerKey = (id: string) => `h:${id}`;
const connKey = (id: string) => `c:${id}`;
const ROOT_KEY = "root";
const idOf = (key: string) => key.slice(2);
const kindOf = (key: unknown) => String(key).slice(0, 2);

const byOrder =
  <T extends { order?: number }>(name: (item: T) => string) =>
  (a: T, b: T) =>
    // Unordered items (new ones) sort after ordered ones, then by name.
    (a.order ?? Infinity) - (b.order ?? Infinity) || name(a).localeCompare(name(b));

function layoutOf(buckets: Record<string, Bucket>, groups: Record<string, Group>): Layout {
  const members: Record<string, string[]> = { [UNGROUPED]: [] };
  const sortedGroups = Object.values(groups).sort(byOrder((g) => g.name));
  for (const group of sortedGroups) members[group.id] = [];
  for (const bucket of Object.values(buckets).sort(byOrder((b) => b.nickname))) {
    const key = bucket.groupId && groups[bucket.groupId] ? bucket.groupId : UNGROUPED;
    members[key].push(bucket.id);
  }
  return { groups: sortedGroups.map((g) => g.id), members };
}

/** Groups by pointer position; connections by pointer, then the nearest row. */
const collision: CollisionDetection = (args) => {
  if (kindOf(args.active.id) === "g:") {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => kindOf(c.id) === "g:"),
    });
  }
  const targets = args.droppableContainers.filter((c) => kindOf(c.id) !== "g:");
  const hits = pointerWithin({ ...args, droppableContainers: targets });
  const pick = (kind: string) => hits.find((h) => kindOf(h.id) === kind);
  const hit = pick("c:") ?? pick("h:") ?? hits.find((h) => h.id === ROOT_KEY);
  if (hit) return [hit];
  return closestCenter({
    ...args,
    droppableContainers: targets.filter((c) => kindOf(c.id) === "c:"),
  });
};

export default function ConnectionTree({
  query,
  onSelect,
  onEditConnection,
  onDeleteConnection,
  onEditGroup,
  onDeleteGroup,
}: {
  query: string;
  onSelect: (bucketId: string) => void;
  onEditConnection: (bucket: Bucket) => void;
  onDeleteConnection: (bucket: Bucket) => void;
  onEditGroup: (group: Group) => void;
  onDeleteGroup: (group: Group) => void;
}) {
  const { configs, toggleGroup, arrangeSidebar } = useConfig();
  const { buckets, groups } = configs;

  const saved = useMemo(() => layoutOf(buckets, groups), [buckets, groups]);
  // While dragging, the arrangement the pointer is proposing.
  const [draft, setDraft] = useState<Layout | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overHeader, setOverHeader] = useState<string | null>(null);
  const layout = draft ?? saved;
  // A drop that lands on the row it started from would also click it.
  const droppedAt = useRef(0);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
  );

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const matches = (id: string) => {
    const b = buckets[id];
    return !q || b.nickname.toLowerCase().includes(q) || b.bucketName.toLowerCase().includes(q);
  };

  const containerOf = (bucketId: string, from: Layout = layout) =>
    Object.keys(from.members).find((key) => from.members[key].includes(bucketId));

  const commit = (next: Layout) => {
    if (JSON.stringify(next) === JSON.stringify(saved)) return;
    arrangeSidebar(next.groups, next.members).catch(() => undefined);
  };

  const moveConnection = (bucketId: string, to: string) => {
    const from = containerOf(bucketId, saved);
    if (from === undefined || from === to) return;
    commit({
      groups: saved.groups,
      members: {
        ...saved.members,
        [from]: saved.members[from].filter((id) => id !== bucketId),
        [to]: [...saved.members[to], bucketId],
      },
    });
  };

  const moveGroup = (groupId: string, by: -1 | 1) => {
    const index = saved.groups.indexOf(groupId);
    const target = index + by;
    if (index < 0 || target < 0 || target >= saved.groups.length) return;
    commit({ groups: arrayMove(saved.groups, index, target), members: saved.members });
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setDragging(String(active.id));
    setDraft(saved);
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    const overKey = over ? String(over.id) : null;
    setOverHeader(overKey && kindOf(overKey) === "h:" ? idOf(overKey) : null);
    if (!over || !overKey || kindOf(active.id) !== "c:") return;

    const bucketId = idOf(String(active.id));
    setDraft((current) => {
      const base = current ?? saved;
      const from = containerOf(bucketId, base);
      if (from === undefined) return current;

      let to: string;
      let index: number;
      if (kindOf(overKey) === "c:") {
        const overId = idOf(overKey);
        const found = containerOf(overId, base);
        if (found === undefined || found === from) return current;
        to = found;
        const below =
          (active.rect.current.translated?.top ?? 0) > over.rect.top + over.rect.height / 2;
        index = base.members[to].indexOf(overId) + (below ? 1 : 0);
      } else {
        to = overKey === ROOT_KEY ? UNGROUPED : idOf(overKey);
        if (to === from || !base.members[to]) return current;
        index = base.members[to].length;
      }

      const target = [...base.members[to]];
      target.splice(index, 0, bucketId);
      return {
        groups: base.groups,
        members: {
          ...base.members,
          [from]: base.members[from].filter((id) => id !== bucketId),
          [to]: target,
        },
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const activeKey = String(active.id);
    const overKey = over ? String(over.id) : null;
    let next = draft ?? saved;

    if (overKey && overKey !== activeKey) {
      if (kindOf(activeKey) === "g:" && kindOf(overKey) === "g:") {
        const from = next.groups.indexOf(idOf(activeKey));
        const to = next.groups.indexOf(idOf(overKey));
        next = { ...next, groups: arrayMove(next.groups, from, to) };
      } else if (kindOf(activeKey) === "c:" && kindOf(overKey) === "c:") {
        const container = containerOf(idOf(activeKey), next);
        const list = container !== undefined ? next.members[container] : [];
        const from = list.indexOf(idOf(activeKey));
        const to = list.indexOf(idOf(overKey));
        if (container !== undefined && from >= 0 && to >= 0) {
          next = { ...next, members: { ...next.members, [container]: arrayMove(list, from, to) } };
        }
      }
    }
    commit(next);
    endDrag();
  };

  const endDrag = () => {
    droppedAt.current = Date.now();
    setDraft(null);
    setDragging(null);
    setOverHeader(null);
  };

  const draggingGroup = dragging !== null && kindOf(dragging) === "g:";
  const draggedBucket = dragging && kindOf(dragging) === "c:" ? buckets[idOf(dragging)] : null;
  const draggedGroup = draggingGroup ? groups[idOf(dragging!)] : null;
  const draggedFromGroup = draggedBucket && containerOf(draggedBucket.id, saved) !== UNGROUPED;

  const groupTargets = Object.values(groups).sort(byOrder((g) => g.name));

  const renderConnection = (id: string, nested: boolean) => {
    const bucket = buckets[id];
    return (
      <SortableConnection
        key={id}
        bucket={bucket}
        nested={nested}
        disabled={searching}
        active={configs.activeBucket === id}
        missingCredential={!bucket.askForCredentials && !configs.credentials[bucket.credentialId]}
        groupTargets={groupTargets}
        onSelect={() => onSelect(id)}
        onEdit={() => onEditConnection(bucket)}
        onDelete={() => onDeleteConnection(bucket)}
        onMove={(to) => moveConnection(id, to)}
      />
    );
  };

  const ungrouped = layout.members[UNGROUPED].filter(matches);
  const visibleGroups = layout.groups.filter(
    (id) => !searching || layout.members[id].some(matches),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={endDrag}
    >
      <div
        onClickCapture={(event) => {
          if (Date.now() - droppedAt.current < 250) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
      >
      <SortableContext items={visibleGroups.map(groupKey)} strategy={verticalListSortingStrategy}>
        <ul className="grid gap-px">
          {visibleGroups.map((groupId, index) => {
            const group = groups[groupId];
            const members = layout.members[groupId].filter(matches);
            // Open while searching, and while the dragged connection sits in it.
            const holdsDragged =
              !!draggedBucket && layout.members[groupId].includes(draggedBucket.id);
            const expanded = !draggingGroup && (searching || !!group.active || holdsDragged);
            return (
              <SortableGroup
                key={groupId}
                group={group}
                count={layout.members[groupId].length}
                expanded={expanded}
                dropping={overHeader === groupId && !!draggedBucket}
                disabled={searching}
                first={index === 0}
                last={index === visibleGroups.length - 1}
                onToggle={() => toggleGroup(groupId).catch(() => undefined)}
                onEdit={() => onEditGroup(group)}
                onDelete={() => onDeleteGroup(group)}
                onMove={(by) => moveGroup(groupId, by)}
              >
                {expanded && (
                  <SortableContext
                    items={members.map((b) => connKey(b))}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="mt-px grid gap-px">
                      {members.length === 0 ? (
                        <li className="flex h-8 items-center pl-9 text-xs text-muted-foreground">
                          {draggedBucket ? "Drop to add" : "Empty group"}
                        </li>
                      ) : (
                        members.map((id) => renderConnection(id, true))
                      )}
                    </ul>
                  </SortableContext>
                )}
              </SortableGroup>
            );
          })}
        </ul>
      </SortableContext>

      <UngroupedList
        showTarget={!!draggedFromGroup && layout.members[UNGROUPED].length <= 1}
        spaced={visibleGroups.length > 0 && (ungrouped.length > 0 || !!draggedFromGroup)}
      >
        <SortableContext items={ungrouped.map(connKey)} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-px">{ungrouped.map((id) => renderConnection(id, false))}</ul>
        </SortableContext>
      </UngroupedList>

      {searching && visibleGroups.length === 0 && ungrouped.length === 0 && (
        <p className="px-2 py-3 text-xs text-muted-foreground">
          No connections match “{query.trim()}”.
        </p>
      )}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {draggedBucket ? (
          <div className="flex h-8 items-center gap-2.5 rounded-lg bg-raised px-2.5 text-sm font-medium shadow-popover ring-1 ring-border">
            <Database className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{draggedBucket.nickname}</span>
          </div>
        ) : draggedGroup ? (
          <div className="flex h-8 items-center gap-2.5 rounded-lg bg-raised px-2.5 text-sm font-medium shadow-popover ring-1 ring-border">
            <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <GroupDot color={draggedGroup.color} />
            <span className="truncate">{draggedGroup.name}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** The ungrouped connections; also where a connection is dropped to leave its group. */
function UngroupedList({
  showTarget,
  spaced,
  children,
}: {
  showTarget: boolean;
  spaced: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: ROOT_KEY });
  return (
    <div ref={setNodeRef} className={cn(spaced && "mt-3")}>
      {children}
      {showTarget && (
        <div
          className={cn(
            "mt-px flex h-8 items-center justify-center rounded-lg border border-dashed text-xs transition-colors duration-100",
            isOver
              ? "border-primary bg-primary-subtle text-primary-text"
              : "border-border-strong text-muted-foreground",
          )}
        >
          Drop here to remove from its group
        </div>
      )}
    </div>
  );
}

function GroupDot({ color }: { color?: string }) {
  return (
    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: groupColor(color) }} />
  );
}

const rowMenuButton =
  "absolute right-1 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-100 hover:bg-foreground/[0.06] hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:bg-foreground/[0.06] data-[state=open]:text-foreground data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100";

function SortableGroup({
  group,
  count,
  expanded,
  dropping,
  disabled,
  first,
  last,
  onToggle,
  onEdit,
  onDelete,
  onMove,
  children,
}: {
  group: Group;
  count: number;
  expanded: boolean;
  dropping: boolean;
  disabled: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (by: -1 | 1) => void;
  children: React.ReactNode;
}) {
  const sortable = useSortable({ id: groupKey(group.id), disabled });
  const header = useDroppable({ id: headerKey(group.id), disabled });

  return (
    <li
      ref={sortable.setNodeRef}
      style={{ transform: CSS.Translate.toString(sortable.transform), transition: sortable.transition }}
      className={cn(sortable.isDragging && "opacity-40")}
    >
      <div ref={header.setNodeRef} className="group relative">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          {...sortable.listeners}
          className={cn(
            "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 pr-9 text-left text-sm transition-colors duration-100",
            dropping
              ? "bg-primary-subtle text-primary-text"
              : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
          )}
        >
          <ChevronRight
            className={cn("size-3.5 shrink-0 transition-transform duration-150", expanded && "rotate-90")}
          />
          <GroupDot color={group.color} />
          <span className="min-w-0 flex-1 truncate font-medium">{group.name}</span>
          <span className="text-xs tabular group-focus-within:invisible group-hover:invisible [@media(hover:none)]:invisible">
            {count}
          </span>
        </button>
        <Menu modal={false}>
          <MenuTrigger className={rowMenuButton} aria-label={`Actions for ${group.name}`}>
            <MoreHorizontal className="size-4" />
          </MenuTrigger>
          <MenuContent align="start" side="right">
            <MenuItem onSelect={onEdit}>
              <Pencil /> Edit group…
            </MenuItem>
            <MenuItem disabled={first} onSelect={() => onMove(-1)}>
              <ArrowUp /> Move up
            </MenuItem>
            <MenuItem disabled={last} onSelect={() => onMove(1)}>
              <ArrowDown /> Move down
            </MenuItem>
            <MenuSeparator />
            <MenuItem destructive onSelect={onDelete}>
              <Trash2 /> Delete group…
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {children}
    </li>
  );
}

function SortableConnection({
  bucket,
  nested,
  disabled,
  active,
  missingCredential,
  groupTargets,
  onSelect,
  onEdit,
  onDelete,
  onMove,
}: {
  bucket: Bucket;
  nested: boolean;
  disabled: boolean;
  active: boolean;
  missingCredential: boolean;
  groupTargets: Group[];
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (groupId: string) => void;
}) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({
    id: connKey(bucket.id),
    disabled,
  });
  const current = bucket.groupId ?? UNGROUPED;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("group relative", isDragging && "opacity-40")}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "page" : undefined}
        title={`${bucket.bucketName} · ${bucket.region}`}
        {...listeners}
        className={cn(
          "flex h-8 w-full items-center gap-2.5 rounded-lg pr-9 text-left text-sm transition-colors duration-100",
          nested ? "pl-9" : "pl-2.5",
          active
            ? "bg-raised font-medium text-foreground shadow-card ring-1 ring-border"
            : "text-foreground/90 hover:bg-foreground/[0.04]",
        )}
      >
        {!nested && (
          <Database
            className={cn("size-4 shrink-0", active ? "text-primary-text" : "text-muted-foreground")}
            aria-hidden
          />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate">{bucket.nickname}</span>
          {bucket.askForCredentials && (
            <KeyRound
              className="size-3 shrink-0 text-muted-foreground"
              aria-label="Asks for keys when connecting"
            />
          )}
        </span>
        {missingCredential && (
          <span
            className="size-1.5 shrink-0 rounded-full bg-warning group-focus-within:invisible group-hover:invisible"
            title="No credential assigned"
          />
        )}
      </button>
      <Menu modal={false}>
        <MenuTrigger className={rowMenuButton} aria-label={`Actions for ${bucket.nickname}`}>
          <MoreHorizontal className="size-4" />
        </MenuTrigger>
        <MenuContent align="start" side="right">
          <MenuItem onSelect={onEdit}>
            <Pencil /> Edit connection…
          </MenuItem>
          {groupTargets.length > 0 && (
            <MenuSub>
              <MenuSubTrigger>
                <FolderInput /> Move to group
              </MenuSubTrigger>
              <MenuSubContent>
                <MenuRadioGroup value={current} onValueChange={onMove}>
                  {groupTargets.map((g) => (
                    <MenuRadioItem key={g.id} value={g.id}>
                      <GroupDot color={g.color} />
                      <span className="truncate">{g.name}</span>
                    </MenuRadioItem>
                  ))}
                  <MenuSeparator />
                  <MenuRadioItem value={UNGROUPED}>No group</MenuRadioItem>
                </MenuRadioGroup>
              </MenuSubContent>
            </MenuSub>
          )}
          <MenuSeparator />
          <MenuItem destructive onSelect={onDelete}>
            <Trash2 /> Remove connection…
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}
