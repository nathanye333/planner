"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { AvatarUpload } from "@/components/avatar-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIMEZONES } from "@/lib/constants";
import type { Tables } from "@/lib/types/database.types";
import { updateProfile, type ActionResult } from "./actions";

export function SettingsForm({ profile }: { profile: Tables<"profiles"> }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updateProfile,
    null,
  );
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url);
  const [name, setName] = useState(profile.display_name);
  const [timezone, setTimezone] = useState(profile.timezone);

  useEffect(() => {
    if (!state) return;
    if ("error" in state) toast.error(state.error);
    else toast.success("Profile updated");
  }, [state]);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-5">
      <AvatarUpload
        userId={profile.id}
        name={name || "You"}
        value={avatar}
        onChange={setAvatar}
      />
      <input type="hidden" name="avatar_url" value={avatar ?? ""} />

      <div className="grid gap-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={profile.username ?? ""}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="timezone">Timezone</Label>
        <input type="hidden" name="timezone" value={timezone} />
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          rows={2}
        />
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}
