import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Source = {
  label: string;
  title: string;
  excerpt: string;
  meta: string;
};

export function SourceCitation({ index, source }: { index: number; source: Source }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 translate-y-[-3px] items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground hover:bg-primary hover:text-primary-foreground"
        >
          {index}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm" side="top">
        <p className="font-medium">{source.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{source.meta}</p>
        <p className="mt-2 rounded bg-muted p-2 text-xs leading-relaxed">{source.excerpt}</p>
      </PopoverContent>
    </Popover>
  );
}
