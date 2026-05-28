"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AIAgentChat } from "@/components/ai-agent-chat";
import { BotMessageSquareIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

interface AIAgentProps {
  onTodosUpdated?: (force?: boolean) => Promise<void> | void;
}

export default function AIAgent({ onTodosUpdated }: AIAgentProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 rounded-full size-14 shadow-lg hover:shadow-xl transition-all z-40"
          size="icon"
        >
          <BotMessageSquareIcon className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full max-w-md p-0 mb-2 rounded-lg"
        side="top"
        align="end"
      >
        <AIAgentChat
          compact={true}
          onChatOpen={() => {
            setOpen(false);
          }}
          onTodosUpdated={onTodosUpdated}
        />
      </PopoverContent>
    </Popover>
  );
}
