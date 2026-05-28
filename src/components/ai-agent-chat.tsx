"use client";

import { useState } from "react";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { ExternalLinkIcon, SparklesIcon, Trash2Icon } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIAgentChatProps {
  compact?: boolean;
  onChatOpen?: () => void;
  onTodosUpdated?: (force?: boolean) => Promise<void> | void;
}

export function AIAgentChat({
  compact = false,
  onChatOpen,
  onTodosUpdated,
}: AIAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "👋 Hello! I'm your AI Todo Assistant. I can help you manage your tasks, prioritize your work, and provide suggestions for better productivity. What would you like help with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: !done });
        buffer += chunk;

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1]; // Keep incomplete line in buffer

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();

          // Skip empty lines and non-data lines
          if (!line || !line.startsWith("data:")) continue;

          try {
            const jsonStr = line.slice(5).trim(); // Remove "data: " prefix
            if (jsonStr === "[DONE]") break;

            const event = JSON.parse(jsonStr);

            // Extract text from text-delta events
            if (event.type === "text-delta" && event.delta) {
              fullContent += event.delta;

              // Update message with accumulated content
              setMessages((prev) => [
                ...prev.slice(0, -1),
                { ...assistantMessage, content: fullContent },
              ]);
            }

            // Log all events for debugging
            if (event.type) {
              console.log(`[AI SDK Event] type: ${event.type}`, event);
            }
          } catch (e) {
            // Skip lines that aren't valid JSON
            continue;
          }
        }
      }

      // Always refetch after AI response completes - ensures todos are synced
      // This handles any mutations the AI made (create, update, delete)
      if (onTodosUpdated) {
        console.log("[Chat] Stream completed, refetching todos");
        // Use a delay to ensure backend has processed all mutations
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          await onTodosUpdated(true);
          console.log("[Chat] Todos refetch completed");
        } catch (err) {
          console.error("[Chat] Failed to refetch todos:", err);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please make sure the API key is configured.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content:
          "👋 Hello! I'm your AI Todo Assistant. I can help you manage your tasks, prioritize your work, and provide suggestions for better productivity. What would you like help with today?",
      },
    ]);
  };

  if (compact) {
    return (
      <div className="flex h-96 flex-col rounded-lg border bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-purple-600">
              <SparklesIcon className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold">AI Assistant</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onChatOpen}
            className="text-xs"
          >
            <ExternalLinkIcon />
          </Button>
        </div>

        {/* Messages */}
        <Conversation className="flex-1">
          <ConversationContent className="gap-3">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent>
                    <MessageResponse className="text-sm">
                      {msg.content}
                    </MessageResponse>
                  </MessageContent>
                </Message>
              ))
            ) : (
              <ConversationEmptyState
                title="Start the conversation"
                description="Ask your AI assistant anything about your todos"
              />
            )}
            {isLoading && (
              <div className="flex gap-2">
                <Spinner className="h-4 w-4" />
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            )}
          </ConversationContent>
        </Conversation>

        {/* Input */}
        <Separator />
        <div className="p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="shrink-0"
            >
              {isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <SparklesIcon className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Full screen chat
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-blue-500 to-purple-600">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Todo Assistant</h1>
              <p className="text-xs text-muted-foreground">
                Powered by Google Gemma 4
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="gap-2"
          >
            <Trash2Icon className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-background">
        <Conversation className="mx-auto max-w-4xl">
          <ConversationContent className="gap-6 px-6 py-6">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <Message key={msg.id} from={msg.role}>
                  <MessageContent>
                    <MessageResponse>{msg.content}</MessageResponse>
                  </MessageContent>
                </Message>
              ))
            ) : (
              <ConversationEmptyState
                title="Start a conversation"
                description="Ask your AI assistant how to organize your todos"
              />
            )}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <Spinner className="h-4 w-4" />
                </div>
                <p className="text-sm text-muted-foreground">
                  AI is thinking...
                </p>
              </div>
            )}
          </ConversationContent>
        </Conversation>
      </div>

      {/* Input Area */}
      <div className="border-t bg-card px-6 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="mx-auto max-w-4xl"
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ask me to help with your todos..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="lg"
              className="gap-2 shrink-0"
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Sending...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            💡 Tip: Ask for task suggestions, priority recommendations, or help
            organizing your todos!
          </p>
        </form>
      </div>
    </div>
  );
}
