import '@rainbow-me/rainbowkit/styles.css';
import { Web3Provider } from '@/providers/Web3Provider';

export const metadata = {
  title: 'QuantumAuth Demo',
  description: 'Demo using QuantumAuth',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body><Web3Provider>{children}</Web3Provider></body>
    </html>
  )
}
