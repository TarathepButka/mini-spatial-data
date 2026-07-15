import { Check, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, DropdownTriggerButton } from "../../../components/ui/DropdownMenu";
import { THAI_PROVINCES } from "../utils/provinces";

type ProvinceFilterDropdownProps = {
    province: string;
    /** Map of province name → feature count (from current data). */
    provinceCounts: ReadonlyMap<string, number>;
    onChange: (province: string) => void;
};

export function ProvinceFilterDropdown({ province, provinceCounts, onChange }: ProvinceFilterDropdownProps) {
    const [search, setSearch] = useState("");
    const label = province || "All provinces";

    // Merge static 77 provinces with any extra provinces from data that aren't in the static list
    const allProvinces = useMemo(() => {
        const staticSet = new Set<string>(THAI_PROVINCES);
        const extras: string[] = [];

        for (const key of provinceCounts.keys()) {
            if (key.trim() && !staticSet.has(key)) {
                extras.push(key);
            }
        }

        return [...THAI_PROVINCES, ...extras.sort()];
    }, [provinceCounts]);

    // Filter by search term
    const filteredProvinces = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return allProvinces;
        return allProvinces.filter((p) => p.toLowerCase().includes(term));
    }, [allProvinces, search]);

    // Sort: provinces with data first (by count desc), then without data (alphabetically)
    const sortedProvinces = useMemo(() => {
        return [...filteredProvinces].sort((a, b) => {
            const countA = provinceCounts.get(a) ?? 0;
            const countB = provinceCounts.get(b) ?? 0;

            // Both have data → sort by count desc
            if (countA > 0 && countB > 0) return countB - countA;
            // One has data, the other doesn't → data first
            if (countA > 0) return -1;
            if (countB > 0) return 1;
            // Neither has data → alphabetical
            return a.localeCompare(b);
        });
    }, [filteredProvinces, provinceCounts]);

    const totalWithData = useMemo(
        () => allProvinces.filter((p) => (provinceCounts.get(p) ?? 0) > 0).length,
        [allProvinces, provinceCounts],
    );

    function selectProvince(nextProvince: string, close: () => void) {
        onChange(nextProvince);
        setSearch("");
        close();
    }

    return (
        <DropdownMenu
            menuClassName="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded border border-zinc-200 bg-white text-sm text-zinc-700 shadow-lg"
            renderTrigger={({ open, toggle }) => (
                <DropdownTriggerButton open={open} title="Province filter" icon={<MapPin size={16} />} onClick={toggle}>
                    {label}
                </DropdownTriggerButton>
            )}
        >
            {({ close }) => (
                <>
                    {/* Search input */}
                    <div className="border-b border-zinc-100 p-2">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="ค้นหาจังหวัด..."
                                autoComplete="off"
                                className="h-8 w-full rounded border border-zinc-200 bg-zinc-50 pl-8 pr-3 text-sm outline-none transition focus:border-zinc-400"
                            />
                        </div>
                    </div>

                    {/* Options list */}
                    <div className="max-h-72 overflow-auto overscroll-contain p-1">
                        {/* All provinces option */}
                        <DropdownMenuItem
                            role="menuitemradio"
                            aria-checked={!province}
                            active={!province}
                            onClick={() => selectProvince("", close)}
                        >
                            <span className="truncate">All provinces</span>
                            <span className="flex items-center gap-2">
                                {!province ? <Check size={16} /> : null}
                            </span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {filteredProvinces.length === 0 && (
                            <div className="px-3 py-2 text-zinc-400">ไม่พบจังหวัด</div>
                        )}

                        {sortedProvinces.map((option) => {
                            const active = province === option;
                            const count = provinceCounts.get(option) ?? 0;

                            return (
                                <DropdownMenuItem
                                    key={option}
                                    role="menuitemradio"
                                    aria-checked={active}
                                    onClick={() => selectProvince(option, close)}
                                >
                                    <span className="truncate">{option}</span>
                                    <span className="flex items-center gap-2">
                                        {active ? <Check size={16} className="shrink-0 text-zinc-950" /> : null}
                                    </span>
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                </>
            )}
        </DropdownMenu>
    );
}
