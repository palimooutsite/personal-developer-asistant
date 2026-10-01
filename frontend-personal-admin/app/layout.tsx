import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"PDA Platform Admin", description:"Platform administration untuk Personal Developer Assistant." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }