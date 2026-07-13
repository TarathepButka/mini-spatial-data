import { Check, ListFilter } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownTriggerButton } from "../../components/ui/DropdownMenu";
import { DEFAULT_CATEGORIES, categoryColor } from "./styles";

type CategoryFilterDropdownProps = {
  categories: string[];
  selectedCategories: string[];
  onChange: (categories: string[]) => void;
};

export function CategoryFilterDropdown({ categories, selectedCategories, onChange }: CategoryFilterDropdownProps) {
  const options = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).filter(Boolean);
  const allSelected = selectedCategories.length === 0;
  const label = allSelected
    ? "All confidence"
    : selectedCategories.length <= 2
      ? selectedCategories.join(", ")
      : `${selectedCategories.length} selected`;

  function toggle(category: string) {
    if (selectedCategories.includes(category)) {
      onChange(selectedCategories.filter((item) => item !== category));

      return;
    }

    onChange([...selectedCategories, category]);
  }

  return (
    <DropdownMenu
      renderTrigger={({ open, toggle }) => (
        <DropdownTriggerButton open={open} title="Confidence filter" icon={<ListFilter size={16} />} onClick={toggle}>
          {label}
        </DropdownTriggerButton>
      )}
    >
      <DropdownMenuItem role="menuitemcheckbox" aria-checked={allSelected} active={allSelected} onClick={() => onChange([])}>
        <span>All confidence</span>
        {allSelected ? <Check size={16} /> : null}
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {options.map((category) => {
        const active = selectedCategories.includes(category);

        return (
          <DropdownMenuItem key={category} role="menuitemcheckbox" aria-checked={active} onClick={() => toggle(category)}>
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColor(category) }} />
              <span className="truncate">{category}</span>
            </span>
            {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenu>
  );
}
