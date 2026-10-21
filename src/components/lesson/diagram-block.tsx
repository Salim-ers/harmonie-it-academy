"use client";

import { DIAGRAMS } from "@/components/diagrams/registry";
import type { DiagramId } from "@/content/schema";

export function DiagramBlock({ diagram }: { diagram: DiagramId }) {
  const C = DIAGRAMS[diagram];
  return C ? <C /> : null;
}
