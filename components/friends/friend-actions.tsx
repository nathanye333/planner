"use client";

import { ActionButton } from "@/components/action-button";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "@/lib/actions/friends";

export function RemoveFriendButton({ friendId }: { friendId: string }) {
  return (
    <ActionButton
      size="sm"
      variant="ghost"
      action={() => removeFriend(friendId)}
      successMessage="Friend removed"
    >
      Remove
    </ActionButton>
  );
}

export function AcceptRequestButton({ requestId }: { requestId: string }) {
  return (
    <ActionButton
      size="sm"
      action={() => acceptFriendRequest(requestId)}
      successMessage="You're now friends"
    >
      Accept
    </ActionButton>
  );
}

export function DeclineRequestButton({ requestId }: { requestId: string }) {
  return (
    <ActionButton
      size="sm"
      variant="outline"
      action={() => declineFriendRequest(requestId)}
    >
      Decline
    </ActionButton>
  );
}

export function CancelRequestButton({ requestId }: { requestId: string }) {
  return (
    <ActionButton
      size="sm"
      variant="ghost"
      action={() => cancelFriendRequest(requestId)}
    >
      Cancel
    </ActionButton>
  );
}
