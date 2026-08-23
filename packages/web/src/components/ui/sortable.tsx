import {
  type Announcements,
  closestCenter,
  DndContext,
  type DndContextProps,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
  DragOverlay,
  type DragStartEvent,
  type DropAnimation,
  defaultDropAnimationSideEffects,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  type SortableContextProps,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";
import { cn } from "@/lib/utils";

interface SortableRootContextValue<T> {
  id: string;
  items: UniqueIdentifier[];
  activeId: UniqueIdentifier | null;
  getItemValue: (item: T) => UniqueIdentifier;
}

const SortableRootContext = React.createContext<SortableRootContextValue<unknown> | null>(null);

function useSortableContext(name: string) {
  const context = React.useContext(SortableRootContext);
  if (!context) throw new Error(`\`${name}\` must be used within \`Sortable\``);
  return context;
}

interface SortableProps<T> extends Omit<DndContextProps, "id"> {
  value: T[];
  onValueChange?: (items: T[]) => void;
  getItemValue: (item: T) => UniqueIdentifier;
}

function Sortable<T>(props: SortableProps<T>) {
  const { value, onValueChange, getItemValue, children, ...dndProps } = props;

  const id = React.useId();
  const [activeId, setActiveId] = React.useState<UniqueIdentifier | null>(null);
  const modifiers = [restrictToVerticalAxis, restrictToParentElement];

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const items = React.useMemo(() => value.map((item) => getItemValue(item)), [value, getItemValue]);

  const onDragStart = React.useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const activeIndex = value.findIndex((item) => getItemValue(item) === active.id);
        const overIndex = value.findIndex((item) => getItemValue(item) === over.id);
        onValueChange?.(arrayMove(value, activeIndex, overIndex));
      }
      setActiveId(null);
    },
    [value, onValueChange, getItemValue],
  );

  const onDragCancel = React.useCallback(() => setActiveId(null), []);

  const announcements: Announcements = React.useMemo(
    () => ({
      onDragStart({ active }) {
        return `Grabbed item. Position ${active.data.current?.sortable.index + 1} of ${value.length}.`;
      },
      onDragOver({ active, over }) {
        if (over) {
          const idx = over.data.current?.sortable.index ?? 0;
          return `Moved to position ${idx + 1} of ${value.length}.`;
        }
        return "Not over a droppable area.";
      },
      onDragEnd({ over }) {
        if (over) {
          return `Dropped at position ${(over.data.current?.sortable.index ?? 0) + 1} of ${value.length}.`;
        }
        return "Dropped. No changes.";
      },
      onDragCancel() {
        return "Sorting cancelled.";
      },
    }),
    [value],
  );

  const contextValue = React.useMemo(
    () => ({ id, items, activeId, getItemValue }),
    [id, items, activeId, getItemValue],
  );

  return (
    <SortableRootContext.Provider value={contextValue as SortableRootContextValue<unknown>}>
      <DndContext
        collisionDetection={closestCenter}
        modifiers={modifiers}
        sensors={sensors}
        {...dndProps}
        id={id}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        accessibility={{ announcements }}
      >
        {children}
      </DndContext>
    </SortableRootContext.Provider>
  );
}

interface SortableContentProps extends React.ComponentProps<"div"> {
  strategy?: SortableContextProps["strategy"];
}

function SortableContent({ strategy, children, ...props }: SortableContentProps) {
  const context = useSortableContext("SortableContent");
  return (
    <SortableContext items={context.items} strategy={strategy ?? verticalListSortingStrategy}>
      <div data-slot="sortable-content" {...props}>
        {children}
      </div>
    </SortableContext>
  );
}

interface SortableItemContextValue {
  id: string;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  isDragging?: boolean;
}

const SortableItemContext = React.createContext<SortableItemContextValue | null>(null);

interface SortableItemProps extends React.ComponentProps<"div"> {
  value: UniqueIdentifier;
  disabled?: boolean;
}

function SortableItem({
  value,
  style,
  disabled,
  className,
  ref,
  children,
  ...props
}: SortableItemProps) {
  const id = React.useId();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value, disabled });

  const composedStyle = React.useMemo<React.CSSProperties>(
    () => ({ transform: CSS.Translate.toString(transform), transition, ...style }),
    [transform, transition, style],
  );

  const itemContext = React.useMemo<SortableItemContextValue>(
    () => ({ id, attributes, listeners, setActivatorNodeRef, isDragging }),
    [id, attributes, listeners, setActivatorNodeRef, isDragging],
  );

  return (
    <SortableItemContext.Provider value={itemContext}>
      <div
        data-slot="sortable-item"
        data-dragging={isDragging ? "" : undefined}
        {...props}
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        style={composedStyle}
        className={cn(isDragging && "opacity-50", className)}
      >
        {children}
      </div>
    </SortableItemContext.Provider>
  );
}

interface SortableItemHandleProps extends React.ComponentProps<"button"> {}

function SortableItemHandle({ className, ref, ...props }: SortableItemHandleProps) {
  const itemContext = React.useContext(SortableItemContext);
  if (!itemContext) throw new Error("`SortableItemHandle` must be within `SortableItem`");

  return (
    <button
      type="button"
      aria-controls={itemContext.id}
      data-dragging={itemContext.isDragging ? "" : undefined}
      {...props}
      {...itemContext.attributes}
      {...itemContext.listeners}
      ref={(node) => {
        itemContext.setActivatorNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn("cursor-grab select-none data-[dragging]:cursor-grabbing", className)}
    />
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

interface SortableOverlayProps extends Omit<React.ComponentProps<typeof DragOverlay>, "children"> {
  children?: ((params: { value: UniqueIdentifier }) => React.ReactNode) | React.ReactNode;
}

function SortableOverlay({ children, ...props }: SortableOverlayProps) {
  const context = useSortableContext("SortableOverlay");

  return ReactDOM.createPortal(
    <DragOverlay
      dropAnimation={dropAnimation}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      className="cursor-grabbing"
      {...props}
    >
      {context.activeId
        ? typeof children === "function"
          ? children({ value: context.activeId })
          : children
        : null}
    </DragOverlay>,
    globalThis.document?.body,
  );
}

export { Sortable, SortableContent, SortableItem, SortableItemHandle, SortableOverlay };
