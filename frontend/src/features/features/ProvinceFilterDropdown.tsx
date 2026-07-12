import { Check, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownTriggerButton } from "../../components/ui/DropdownMenu";

type ProvinceFilterDropdownProps = {
  province: string;
  provinceOptions: string[];
  onChange: (province: string) => void;
};

export function ProvinceFilterDropdown({ province, provinceOptions, onChange }: ProvinceFilterDropdownProps) {
  const label = province || "All provinces";

  function selectProvince(nextProvince: string, close: () => void) {
    onChange(nextProvince);
    close();
  }

  return (
    <DropdownMenu
      renderTrigger={({ open, toggle }) => (
        <DropdownTriggerButton open={open} title="Province filter" icon={<MapPin size={16} />} onClick={toggle}>
          {label}
        </DropdownTriggerButton>
      )}
    >
      {({ close }) => (
        <>
          <DropdownMenuItem role="menuitemradio" aria-checked={!province} active={!province} onClick={() => selectProvince("", close)}>
            <span className="truncate">All provinces</span>
            {!province ? <Check size={16} /> : null}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {provinceOptions.map((option) => {
            const active = province === option;
            return (
              <DropdownMenuItem key={option} role="menuitemradio" aria-checked={active} onClick={() => selectProvince(option, close)}>
                <span className="truncate">{option}</span>
                {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
              </DropdownMenuItem>
            );
          })}
        </>
      )}
    </DropdownMenu>
  );
}
