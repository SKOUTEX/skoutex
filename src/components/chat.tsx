import { useChat } from "ai/react";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card } from "~/components/ui/card";
import { MessageSquare, Loader2, Send } from "lucide-react";

export function Chat() {
  const { messages, input, setInput, isLoading, append } = useChat({
    api: "/api/chat",
    // maxSteps: 3,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    void append({
      content: input,
      role: "user",
    });
  };

  return (
    <>
      <main className="flex-1 overflow-auto bg-background">
        <div className="container px-4 py-4">
          <div className="space-y-4">
            {messages.map((message, i) => (
              <Card
                key={i}
                className={`flex items-start gap-3 p-4 ${
                  message.role === "assistant"
                    ? "bg-secondary"
                    : "bg-background"
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={
                      message.role === "user"
                        ? "/user-avatar.png"
                        : "/ai-avatar.png"
                    }
                  />
                  <AvatarFallback>
                    {message.role === "user" ? "U" : "AI"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="prose prose-neutral dark:prose-invert">
                    {message.content}
                  </div>
                  {message.toolInvocations?.map((tool, index) => (
                    <Card
                      key={index}
                      className="mt-2 bg-muted p-3 text-sm text-muted-foreground"
                    >
                      <p className="font-medium">Tool: {tool.toolName}</p>
                      <pre className="mt-2 overflow-auto">
                        {JSON.stringify(tool.args, null, 2)}
                      </pre>
                    </Card>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t bg-background">
        <form onSubmit={handleSubmit} className="container flex gap-2 p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about player statistics, team performance, or match analysis..."
            className="min-h-[48px] w-full resize-none rounded-md"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </footer>
    </>
  );
}
