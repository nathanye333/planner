"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database.types";

const BUCKET = "event-photos";
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export function EventPhotos({
  eventId,
  userId,
}: {
  eventId: string;
  userId: string;
}) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const queryKey = ["event-photos", eventId];

  const { data: photos = [] } = useQuery({
    queryKey,
    queryFn: async (): Promise<Tables<"event_photos">[]> => {
      const { data } = await supabase
        .from("event_photos")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  function publicUrl(path: string) {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 8MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${eventId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      setUploading(false);
      return;
    }
    const { error } = await supabase.from("event_photos").insert({
      event_id: eventId,
      uploader_id: userId,
      storage_path: path,
    });
    if (error) toast.error(error.message);
    setUploading(false);
    queryClient.invalidateQueries({ queryKey });
  }

  const remove = useMutation({
    mutationFn: async (photo: Tables<"event_photos">) => {
      await supabase.storage.from(BUCKET).remove([photo.storage_path]);
      const { error } = await supabase
        .from("event_photos")
        .delete()
        .eq("id", photo.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Photos ({photos.length})</CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          Add photo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <p className="text-muted-foreground text-center text-sm">
            Share memories from this event.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicUrl(p.storage_path)}
                  alt={p.caption ?? "Event photo"}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                {p.uploader_id === userId && (
                  <button
                    onClick={() => remove.mutate(p)}
                    className="bg-background/80 absolute top-1.5 right-1.5 rounded-full p-1.5 opacity-0 shadow transition group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
