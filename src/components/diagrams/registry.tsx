"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { DiagramId } from "@/content/schema";

/** Emplacement affiché pendant le chargement d'un schéma. */
const fallback = () => <div className="h-56 animate-pulse rounded-[var(--radius-panel)] bg-mist" aria-hidden="true" />;

/** Un import dynamique par schéma : chaque schéma n'est chargé que dans la leçon qui l'utilise. */
export const DIAGRAMS: Record<DiagramId, ComponentType> = {
  "support-levels": dynamic(() => import("./support-levels"), { loading: fallback }),
  "ticket-lifecycle": dynamic(() => import("./ticket-lifecycle"), { loading: fallback }),
  "priority-matrix": dynamic(() => import("./priority-matrix"), { loading: fallback }),
  "communication-loop": dynamic(() => import("./communication-loop"), { loading: fallback }),
  "diagnostic-method": dynamic(() => import("./diagnostic-method"), { loading: fallback }),
  "itil-practices": dynamic(() => import("./itil-practices"), { loading: fallback }),
  "windows-tools": dynamic(() => import("./windows-tools"), { loading: fallback }),
  "powershell-pipeline": dynamic(() => import("./powershell-pipeline"), { loading: fallback }),
  "computer-anatomy": dynamic(() => import("./computer-anatomy"), { loading: fallback }),
  "boot-sequence": dynamic(() => import("./boot-sequence"), { loading: fallback }),
  "print-path": dynamic(() => import("./print-path"), { loading: fallback }),
  "windows-profile": dynamic(() => import("./windows-profile"), { loading: fallback }),
  "disk-layout": dynamic(() => import("./disk-layout"), { loading: fallback }),
  "packet-journey": dynamic(() => import("./packet-journey"), { loading: fallback }),
  "ip-anatomy": dynamic(() => import("./ip-anatomy"), { loading: fallback }),
  "subnet-split": dynamic(() => import("./subnet-split"), { loading: fallback }),
  "dhcp-dora": dynamic(() => import("./dhcp-dora"), { loading: fallback }),
  "dns-resolution": dynamic(() => import("./dns-resolution"), { loading: fallback }),
  "osi-layers": dynamic(() => import("./osi-layers"), { loading: fallback }),
  "tcp-handshake": dynamic(() => import("./tcp-handshake"), { loading: fallback }),
  "arp-exchange": dynamic(() => import("./arp-exchange"), { loading: fallback }),
  "wifi-auth": dynamic(() => import("./wifi-auth"), { loading: fallback }),
  "vlan-segmentation": dynamic(() => import("./vlan-segmentation"), { loading: fallback }),
  "ad-structure": dynamic(() => import("./ad-structure"), { loading: fallback }),
  "m365-identity": dynamic(() => import("./m365-identity"), { loading: fallback }),
  "virtualization-layers": dynamic(() => import("./virtualization-layers"), { loading: fallback }),
};
