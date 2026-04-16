interface Props {
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ResizableDivider({ onMouseDown }: Props) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="hidden lg:block relative z-10 flex-shrink-0 w-1 bg-border hover:bg-primary/50 active:bg-primary cursor-col-resize group transition-colors"
      title="Drag to resize"
    >
      <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex flex-col gap-0.5">
          <div className="w-0.5 h-1 bg-primary rounded-full" />
          <div className="w-0.5 h-1 bg-primary rounded-full" />
          <div className="w-0.5 h-1 bg-primary rounded-full" />
        </div>
      </div>
    </div>
  );
}
