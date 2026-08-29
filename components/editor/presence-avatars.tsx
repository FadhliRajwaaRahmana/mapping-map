"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function PresenceAvatars({
  people,
  selfId,
}: {
  people: Array<{ userId: string; name: string }>;
  selfId: string;
}) {
  const others = people.filter((p) => p.userId !== selfId);
  if (others.length === 0) return null;
  return (
    <div
      className="flex -space-x-2"
      aria-label={`${others.length} orang lain sedang di peta ini`}
    >
      {others.slice(0, 4).map((p) => (
        <Avatar key={p.userId} className="h-6 w-6 border-2 border-background">
          <AvatarFallback className="text-[10px]">
            {p.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}
      {others.length > 4 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
          +{others.length - 4}
        </span>
      )}
    </div>
  );
}
