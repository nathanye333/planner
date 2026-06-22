"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";

const MAX_BYTES = 3 * 1024 * 1024; // 3MB

export function AvatarUpload({
  userId,
  name,
  value,
  onChange,
}: {
  userId: string;
  name: string;
  value: string | null;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) {
      toast.error("Image must be under 3MB");
      return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    onChange(data.publicUrl);
    setUploading(false);
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="group relative mx-auto block size-24 rounded-full"
    >
      <Avatar className="size-24">
        <AvatarImage src={value ?? undefined} alt={name} />
        <AvatarFallback className="text-2xl">{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="bg-foreground/50 absolute inset-0 flex items-center justify-center rounded-full text-white opacity-0 transition group-hover:opacity-100">
        {uploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Camera className="size-5" />
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
    </button>
  );
}
