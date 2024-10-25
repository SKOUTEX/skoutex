/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import ReactMarkdown from "react-markdown";

function LinkRenderer(props: any) {
  return (
    <a href={props.href} target="_blank" rel="noreferrer">
      {props.children}
    </a>
  );
}

export function MessageModel({ text }: { text: string }) {
  return (
    <div className="prose w-full max-w-full rounded px-2 py-1 font-light">
      <ReactMarkdown components={{ a: LinkRenderer }}>{text}</ReactMarkdown>
    </div>
  );
}
