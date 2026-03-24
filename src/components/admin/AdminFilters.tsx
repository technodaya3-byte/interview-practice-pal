import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type Filters = {
  search: string;
  level: string;
  minScore: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  userId: string;
};

const defaultFilters: Filters = {
  search: "",
  level: "all",
  minScore: "",
  dateFrom: undefined,
  dateTo: undefined,
  userId: "all",
};

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  users: { id: string; name: string }[];
};

export { defaultFilters };

export const AdminFilters = ({ filters, onChange, users }: Props) => {
  const hasActive =
    filters.search ||
    filters.level !== "all" ||
    filters.minScore ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.userId !== "all";

  return (
    <div className="feedback-card p-4 mb-6 space-y-3">
      {/* Row 1: search + user + level */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search job title…"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <Select value={filters.userId} onValueChange={(v) => onChange({ ...filters, userId: v })}>
          <SelectTrigger className="w-[180px] h-9 text-sm">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.level} onValueChange={(v) => onChange({ ...filters, level: v })}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Mid-level</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: score + date range + clear */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input
          type="number"
          placeholder="Min score"
          value={filters.minScore}
          onChange={(e) => onChange({ ...filters, minScore: e.target.value })}
          className="w-[110px] h-9 text-sm"
          min={0}
          max={100}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 text-sm gap-2 font-normal", !filters.dateFrom && "text-muted-foreground")}>
              <CalendarIcon size={14} />
              {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "From"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(d) => onChange({ ...filters, dateFrom: d })}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 text-sm gap-2 font-normal", !filters.dateTo && "text-muted-foreground")}>
              <CalendarIcon size={14} />
              {filters.dateTo ? format(filters.dateTo, "MMM d") : "To"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(d) => onChange({ ...filters, dateTo: d })}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {hasActive && (
          <Button variant="ghost" size="sm" className="h-9 text-sm gap-1 text-muted-foreground" onClick={() => onChange(defaultFilters)}>
            <X size={14} /> Clear
          </Button>
        )}
      </div>
    </div>
  );
};
