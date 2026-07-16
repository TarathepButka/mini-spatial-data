import { Check, Layers } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownTriggerButton } from "../../../components/ui/DropdownMenu";
import { COLLECTION_OPTIONS as DEFAULT_COLLECTION_OPTIONS, collectionColor } from "../utils/collections";
import type { CollectionOption } from "../../../api/features";

type CollectionFilterDropdownProps = {
  selectedCollections: string[];
  collectionOptions: CollectionOption[];
  onChange: (collections: string[]) => void;
};

export function CollectionFilterDropdown({ selectedCollections, collectionOptions, onChange }: CollectionFilterDropdownProps) {
  const options = collectionOptions.length > 0 ? collectionOptions : DEFAULT_COLLECTION_OPTIONS;
  const allSelected = selectedCollections.length === 0;
  const label = allSelected
    ? "All collections"
    : selectedCollections.length <= 2
      ? selectedCollections.map((collection) => options.find((option) => option.id === collection)?.label ?? collection).join(", ")
      : `${selectedCollections.length} collections`;

  function toggle(collection: string) {
    if (selectedCollections.includes(collection)) {
      onChange(selectedCollections.filter((item) => item !== collection));

      return;
    }

    onChange([...selectedCollections, collection]);
  }

  return (
    <DropdownMenu
      renderTrigger={({ open, toggle: toggleOpen }) => (
        <DropdownTriggerButton open={open} title="Collection filter" icon={<Layers size={16} />} onClick={toggleOpen}>
          {label}
        </DropdownTriggerButton>
      )}
    >
      <DropdownMenuItem role="menuitemcheckbox" aria-checked={allSelected} active={allSelected} onClick={() => onChange([])}>
        <span>All collections</span>
        {allSelected ? <Check size={16} /> : null}
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      {options.map((collection) => {
        const active = selectedCollections.includes(collection.id);

        return (
          <DropdownMenuItem key={collection.id} role="menuitemcheckbox" aria-checked={active} onClick={() => toggle(collection.id)}>
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: collectionColor(collection.id, options) }} />
              <span className="truncate">{collection.label}</span>
            </span>
            {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
          </DropdownMenuItem>
        );
      })}
    </DropdownMenu>
  );
}
