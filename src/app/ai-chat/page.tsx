"use client";

import { AIAgentChat } from "@/components/ai-agent-chat";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useTodos } from "@/hooks/use-todos";

export default function AIChatPage() {
  const { refetch } = useTodos();

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b bg-card">
        <div className="flex items-center gap-4 py-3 mx-auto max-w-4xl">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Todos
            </Button>
          </Link>
        </div>
      </nav>

      {/* Chat Interface */}
      <AIAgentChat compact={false} onTodosUpdated={refetch} />
    </div>
  );
}
