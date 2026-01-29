import { ChevronRight, Home } from "lucide-react";
import { Button } from "./ui/button";

interface BreadcrumbProps {
  prefix: string;
  onNavigate: (prefix: string) => void;
}

export default function Breadcrumb({ prefix, onNavigate }: BreadcrumbProps) {
  const parts = prefix
    .split("/")
    .filter((p) => p.length > 0)
    .map((part, index, array) => ({
      name: part,
      prefix: array.slice(0, index + 1).join("/") + "/",
    }));

  return (
    <div className="mt-4 flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate("")}
        className="h-8"
      >
        <Home className="h-4 w-4" />
      </Button>
      {parts.map((part, index) => (
        <div key={part.prefix} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(part.prefix)}
            className="h-8"
          >
            {part.name}
          </Button>
        </div>
      ))}
    </div>
  );
}
