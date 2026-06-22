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
import { completeOnboarding, type ActionResult } from "./actions";

function browserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (TIMEZONES as readonly string[]).includes(tz) ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

export function OnboardingForm({
  userId,
  defaultName,
  defaultUsername,
  defaultAvatar,
}: {
  userId: string;
  defaultName: string;
  defaultUsername: string;
  defaultAvatar: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    completeOnboarding,
    null,
  );
  const [avatar, setAvatar] = useState<string | null>(defaultAvatar);
  const [name, setName] = useState(defaultName);
  const [timezone, setTimezone] = useState(browserTimezone());

  useEffect(() => {
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <AvatarUpload
        userId={userId}
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
          placeholder="Ada Lovelace"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          defaultValue={defaultUsername}
          placeholder="ada"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="timezone">Timezone</Label>
        <input type="hidden" name="timezone" value={timezone} />
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Select timezone" />
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
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea
          id="bio"
          name="bio"
          placeholder="Tell people a little about you"
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
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Saving…" : "Finish setup"}
    </Button>
  );
}
