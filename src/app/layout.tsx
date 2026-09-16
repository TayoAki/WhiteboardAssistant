import type { Metadata } from "next";
import type React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhiteboardAssistant",
  description:
    "An AI whiteboard: an Excalidraw canvas with a CopilotKit agent that can see and edit the board.",
};

/** Root layout: global styles and the html/body shell for every route. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
