"use client";

import { QAProvider } from "@quantumauth/privacy-connector/react";


export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en">
      <body>
      <QAProvider>{children}</QAProvider>
      </body>
      </html>
  );
}