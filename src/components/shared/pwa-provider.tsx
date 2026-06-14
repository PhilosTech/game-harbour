"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const SerwistProvider = dynamic(
  () => import("@serwist/next/react").then((m) => m.SerwistProvider),
  { ssr: false },
);

export function PwaProvider({ children }: { children: ReactNode }) {
  return <SerwistProvider swUrl="/sw.js">{children}</SerwistProvider>;
}
