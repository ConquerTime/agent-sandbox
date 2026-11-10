import type { ReactNode } from 'react';
import { TooltipProvider } from '@cortex/ui/components/ui/tooltip';
import './globals.css';

export const metadata = {
  title: 'Agent Sandbox',
  description: 'Open-source multi-tenant agent sandbox',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
