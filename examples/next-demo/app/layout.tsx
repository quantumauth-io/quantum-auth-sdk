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
      <QAProvider appId="3f0600f8-b915-4d60-b859-38d77b2511f7">
          {children}
      </QAProvider>
      </body>
      </html>
  );
}