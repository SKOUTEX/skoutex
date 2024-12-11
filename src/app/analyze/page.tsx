import React from "react";
import Link from "next/link";
import { MessageSquare, Search, BarChart2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Card } from "~/components/ui/card";
import { ModeToggle } from "~/components/toggle-theme";

export default function AnalyzePage() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/football-icon.png" />
                <AvatarFallback>⚽</AvatarFallback>
              </Avatar>
            </Link>
            <h1 className="text-xl font-semibold">
              Football Analysis Hub
              <p className="text-sm text-muted-foreground">
                Choose your analysis method
              </p>
            </h1>
          </div>
          <ModeToggle />
        </div>
      </header>

      <main className="container flex-1 px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/assistant" className="block">
            <Card className="group relative overflow-hidden p-6 transition-all hover:border-primary">
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Chat Assistant</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Have an interactive conversation about football statistics
                    and analysis
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/assistant?mode=search" className="block">
            <Card className="group relative overflow-hidden p-6 transition-all hover:border-primary">
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Player Search</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Search and analyze individual player statistics
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/assistant?mode=compare" className="block">
            <Card className="group relative overflow-hidden p-6 transition-all hover:border-primary">
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="rounded-full bg-primary/10 p-4 transition-colors group-hover:bg-primary/20">
                  <BarChart2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Player Comparison</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Compare statistics between multiple players
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </>
  );
}
