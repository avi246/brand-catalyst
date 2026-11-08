import { MessageSquare } from "lucide-react";

export const metadata = { title: "Messages" };

export default function MessagesIndexPage() {
  return (
    <div className="hidden flex-1 flex-col items-center justify-center gap-2 p-8 text-center md:flex">
      <MessageSquare className="size-6 text-muted-foreground" />
      <p className="font-medium">Pick a conversation</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Conversations open only after an invitation is accepted, so every chat here is with someone who agreed to talk.
      </p>
    </div>
  );
}
