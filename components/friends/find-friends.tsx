"use client";

import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { ActionButton } from "@/components/action-button";
import { UserChip, type MiniProfile } from "@/components/user-chip";
import { sendFriendRequest } from "@/lib/actions/friends";

export function FindFriends({ excludeIds }: { excludeIds: string[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MiniProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const exclude = new Set(excludeIds);

  async function search(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const term = `%${value.trim()}%`;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .or(`username.ilike.${term},display_name.ilike.${term}`)
      .limit(10);
    setResults((data ?? []).filter((p) => !exclude.has(p.id)));
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          className="pl-9"
          placeholder="Search by name or username"
          value={query}
          onChange={(e) => void search(e.target.value)}
        />
      </div>

      {loading && <p className="text-muted-foreground text-sm">Searching…</p>}

      {!loading && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-muted-foreground text-sm">No users found.</p>
      )}

      <ul className="flex flex-col gap-2">
        {results.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <UserChip profile={p} />
            <ActionButton
              size="sm"
              action={() => sendFriendRequest(p.id)}
              successMessage="Friend request sent"
            >
              <UserPlus className="size-4" />
              Add
            </ActionButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
