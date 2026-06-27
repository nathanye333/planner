"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, timeAgo } from "@/lib/format";
import { useTimezone } from "@/components/timezone-provider";
import type { Tables } from "@/lib/types/database.types";

type CommentRow = Tables<"comments"> & {
  author: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

export function EventComments({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const timezone = useTimezone();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const queryKey = ["comments", eventId];

  const { data: comments = [] } = useQuery({
    queryKey,
    queryFn: async (): Promise<CommentRow[]> => {
      const { data } = await supabase
        .from("comments")
        .select(
          "*, author:profiles!comments_author_id_fkey(id, display_name, avatar_url)",
        )
        .eq("target_type", "event")
        .eq("target_id", eventId)
        .order("created_at", { ascending: true });
      return (data as CommentRow[] | null) ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`comments-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `target_id=eq.${eventId}`,
        },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const add = useMutation({
    mutationFn: async ({
      text,
      parentId,
    }: {
      text: string;
      parentId: string | null;
    }) => {
      const { error } = await supabase.from("comments").insert({
        author_id: userId,
        target_type: "event",
        target_id: eventId,
        parent_id: parentId,
        body: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      setReplyBody("");
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) =>
    comments.filter((c) => c.parent_id === id);

  function CommentBubble({ c }: { c: CommentRow }) {
    return (
      <div className="flex gap-3">
        <Avatar className="size-8">
          <AvatarImage src={c.author?.avatar_url ?? undefined} />
          <AvatarFallback>{initials(c.author?.display_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-muted rounded-lg px-3 py-2">
            <p className="text-sm font-medium">
              {c.author?.display_name ?? "Someone"}
            </p>
            <p className="text-sm whitespace-pre-wrap">{c.body}</p>
          </div>
          <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
            <span>{timeAgo(c.created_at, timezone)}</span>
            {!c.parent_id && (
              <button
                onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                className="hover:underline"
              >
                Reply
              </button>
            )}
            {c.author_id === userId && (
              <button
                onClick={() => remove.mutate(c.id)}
                className="hover:text-destructive flex items-center gap-1"
              >
                <Trash2 className="size-3" />
                Delete
              </button>
            )}
          </div>

          {replyTo === c.id && (
            <div className="mt-2 flex gap-2">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={1}
                placeholder="Write a reply…"
              />
              <Button
                size="sm"
                disabled={!replyBody.trim() || add.isPending}
                onClick={() => add.mutate({ text: replyBody, parentId: c.id })}
              >
                Send
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Discussion ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            placeholder="Add a comment…"
          />
          <Button
            disabled={!body.trim() || add.isPending}
            onClick={() => add.mutate({ text: body, parentId: null })}
          >
            Post
          </Button>
        </div>

        {topLevel.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">
            No comments yet. Start the conversation.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {topLevel.map((c) => (
              <li key={c.id} className="flex flex-col gap-3">
                <CommentBubble c={c} />
                {repliesOf(c.id).length > 0 && (
                  <ul className="ml-11 flex flex-col gap-3">
                    {repliesOf(c.id).map((r) => (
                      <li key={r.id}>
                        <CommentBubble c={r} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
