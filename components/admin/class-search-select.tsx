"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ClassSearchOption = {
  id: string
  name: string
}

type ClassSearchSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: ClassSearchOption[]
  allLabel: string
  searchPlaceholder: string
  emptyLabel: string
  moreResultsLabel: string
  className?: string
  triggerClassName?: string
}

const MAX_SEARCH_RESULTS = 100
const INITIAL_LIST_LIMIT = 100

export function ClassSearchSelect({
  value,
  onValueChange,
  options,
  allLabel,
  searchPlaceholder,
  emptyLabel,
  moreResultsLabel,
  className,
  triggerClassName,
}: ClassSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const selectedLabel = useMemo(() => {
    if (value === "all") return allLabel
    return options.find((o) => o.id === value)?.name ?? value
  }, [value, options, allLabel])

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [options],
  )

  const { displayedOptions, totalMatches, isTruncated } = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      let list = sortedOptions.slice(0, INITIAL_LIST_LIMIT)
      if (value !== "all") {
        const selected = sortedOptions.find((o) => o.id === value)
        if (selected && !list.some((o) => o.id === value)) {
          list = [selected, ...list.slice(0, INITIAL_LIST_LIMIT - 1)]
        }
      }
      return {
        displayedOptions: list,
        totalMatches: sortedOptions.length,
        isTruncated: sortedOptions.length > INITIAL_LIST_LIMIT,
      }
    }
    const matches = sortedOptions.filter(
      (o) => o.name.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
    )
    return {
      displayedOptions: matches.slice(0, MAX_SEARCH_RESULTS),
      totalMatches: matches.length,
      isTruncated: matches.length > MAX_SEARCH_RESULTS,
    }
  }, [sortedOptions, search, value])

  function pick(next: string) {
    onValueChange(next)
    setOpen(false)
    setSearch("")
  }

  return (
    <div className={className}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setSearch("")
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-10 w-full justify-between rounded-xl border-input bg-background px-3 text-left text-sm font-normal shadow-sm",
              triggerClassName,
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <GraduationCap className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedLabel}</span>
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="max-h-72">
              <CommandGroup>
                <CommandItem value="all" onSelect={() => pick("all")}>
                  <Check className={cn("mr-2 size-4", value === "all" ? "opacity-100" : "opacity-0")} />
                  {allLabel}
                </CommandItem>
              </CommandGroup>
              {displayedOptions.length === 0 ? (
                <CommandEmpty>{emptyLabel}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {displayedOptions.map((item) => (
                    <CommandItem key={item.id} value={item.id} onSelect={() => pick(item.id)}>
                      <Check
                        className={cn("mr-2 size-4", value === item.id ? "opacity-100" : "opacity-0")}
                      />
                      <span className="truncate">{item.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {item.id}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {isTruncated ? (
                <p className="border-t border-border/60 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                  {moreResultsLabel
                    .replace("{shown}", String(displayedOptions.length))
                    .replace("{total}", String(totalMatches))}
                </p>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
