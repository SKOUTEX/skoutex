"use client";
import { useChat } from "ai/react";
import React from "react";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card } from "~/components/ui/card";
import { MessageSquare, Loader2, Send, Search, BarChart2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { RiRobot2Line } from "react-icons/ri";
import { BsPerson } from "react-icons/bs";
import { generateId } from "ai";

// Component to display tool invocations in a friendly way
interface ToolArgs {
  name?: string;
}

const ToolInvocation = ({
  tool,
}: {
  tool: { toolName: string; args: ToolArgs };
}) => {
  const getToolInfo = (toolName: string) => {
    switch (toolName) {
      case "searchPlayer":
        return {
          icon: <Search className="h-4 w-4" />,
          message: `Searched for player${
            tool.args.name ? `: ${tool.args.name}` : ""
          }`,
        };
      case "analyzePlayer":
        return {
          icon: <BarChart2 className="h-4 w-4" />,
          message: `Analyzed player statistics${
            tool.args.name ? ` for ${tool.args.name}` : ""
          }`,
        };
      default:
        return {
          icon: <MessageSquare className="h-4 w-4" />,
          message: `Used ${toolName}`,
        };
    }
  };

  const { icon, message } = getToolInfo(tool.toolName);

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
        {icon}
      </div>
      <span>{message}</span>
    </div>
  );
};

export function Chat() {
  const { messages, input, setInput, isLoading, append } = useChat({
    api: "/api/chat",
    maxSteps: 6,
    initialMessages: [
      {
        id: generateId(),
        role: "assistant",
        content: "Hello! What player would you like to analyze?",
      },
    ],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setInput("");
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
                <Avatar>
                  <AvatarFallback className="flex items-center justify-center">
                    {message.role === "user" ? (
                      <BsPerson className="h-5 w-5" />
                    ) : (
                      <RiRobot2Line className="h-5 w-5" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div className="prose prose-neutral max-w-none dark:prose-invert">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  {message.toolInvocations &&
                    message.toolInvocations.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        {message.toolInvocations.map((tool, index) => (
                          <ToolInvocation key={index} tool={tool} />
                        ))}
                      </div>
                    )}
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
            className="min-h-[48px] w-full resize-none rounded-md bg-secondary"
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
