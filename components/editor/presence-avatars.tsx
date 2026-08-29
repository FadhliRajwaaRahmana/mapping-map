"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const avatarColors = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-chart-3 text-white",
  "bg-chart-4 text-white",
];

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
      className="flex -space-x-1.5"
      aria-label={`${others.length} orang lain sedang di peta ini`}
    >
      <AnimatePresence mode="popLayout">
        {others.slice(0, 4).map((p, i) => (
          <motion.div
            key={p.userId}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Avatar
              className={`h-7 w-7 border-2 border-card ${avatarColors[i % avatarColors.length]}`}
            >
              <AvatarFallback
                className={`text-[10px] font-bold ${avatarColors[i % avatarColors.length]}`}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ))}
      </AnimatePresence>
      {others.length > 4 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold"
        >
          +{others.length - 4}
        </motion.span>
      )}
    </div>
  );
}
