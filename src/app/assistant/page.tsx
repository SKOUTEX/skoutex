import React from "react";
import { Chat } from "~/components/chat";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import Link from "next/link";

export const runtime = "edge";
export const preferredRegion = "auto";

export default function Page() {
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
              Football Analysis Assistant
              <p className="text-sm text-muted-foreground">
                Powered by SportsMonk API
              </p>
            </h1>
          </div>
        </div>
      </header>

      <Chat />
    </>
  );
}
