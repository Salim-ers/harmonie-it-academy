"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { ChoiceGroup, DiagramShell, Label, MONO, dotted, ipToInt, prefixMask } from "./shared";

const BASE = [10, 20, 40, 0] as const;
const BASE_PREFIX = 24;
type Prefix = "25" | "26" | "27";
const PREFIXES: Prefix[] = ["25", "26", "27"];

type Subnet = { index: number; network: number; first: number; last: number; broadcast: number; size: number };

/** Découpe 10.20.40.0/24 en sous-réseaux du préfixe demandé. */
function split(prefix: number): Subnet[] {
  const base = ipToInt(BASE);
  const size = 2 ** (32 - prefix);
  const count = 2 ** (prefix - BASE_PREFIX);
  return Array.from({ length: count }, (_, i) => {
    const network = base + i * size;
    return { index: i, network, first: network + 1, last: network + size - 2, broadcast: network + size - 1, size };
  });
}
const lastOctet = (n: number) => n & 255;

const BX = 20;
const BW = 480;
const PX = BW / 256;

export default function SubnetSplitDiagram() {
  const reduced = Boolean(useReducedMotion());
  const [prefix, setPrefix] = useState<Prefix>("26");
  const [sel, setSel] = useState(0);
  const p = Number(prefix);
  const subnets = split(p);
  const cur = subnets[Math.min(sel, subnets.length - 1)];
  const t = { duration: reduced ? 0 : 0.45, ease: "easeInOut" as const };
  const segX = (sn: Subnet) => BX + lastOctet(sn.network) * PX;
  const segW = (sn: Subnet) => sn.size * PX;

  return (
    <DiagramShell
      title={`Découpage de 10.20.40.0/24 en ${subnets.length} sous-réseaux /${p}`}
      controls={
        <div>
          <ChoiceGroup
            label="Découper en"
            options={PREFIXES.map((id) => ({ id, label: `/${id}, ${2 ** (Number(id) - BASE_PREFIX)} sous-réseaux` }))}
            value={prefix}
            onChange={(id) => {
              setPrefix(id);
              setSel(0);
            }}
          />
          <p className="mt-3 text-sm text-ink-2" aria-live="polite">
            Masque <span className="font-mono">{dotted(prefixMask(p))}</span> : {subnets.length} sous-réseaux de {cur.size} adresses, dont {cur.size - 2}{" "}
            utilisables (l&apos;adresse réseau et la diffusion sont réservées).
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
              <caption className="sr-only">Sous-réseaux de 10.20.40.0/24 en /{p}</caption>
              <thead className="text-xs text-muted">
                <tr className="border-b border-line">
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Sous-réseau
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Adresse réseau
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    Plage utilisable
                  </th>
                  <th scope="col" className="py-1.5 font-medium">
                    Diffusion
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px] text-ink-2">
                {subnets.map((sn) => (
                  <tr key={sn.index} className={cn("border-b border-line", sn.index === cur.index && "bg-signal-wash text-ink")}>
                    <td className="py-1 pr-3">
                      <button
                        type="button"
                        aria-pressed={sn.index === cur.index}
                        onClick={() => setSel(sn.index)}
                        className="rounded-[6px] px-1.5 py-0.5 font-sans text-sm underline-offset-2 hover:underline"
                      >
                        {sn.index + 1}
                      </button>
                    </td>
                    <td className="py-1 pr-3">
                      {dotted(sn.network)}/{p}
                    </td>
                    <td className="py-1 pr-3">
                      {dotted(sn.first)} à {dotted(sn.last)}
                    </td>
                    <td className="py-1">{dotted(sn.broadcast)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    >
      <svg viewBox="0 0 520 232" className="h-auto w-full" aria-hidden="true">
        <Label x={BX} y={22} anchor="start" weight={600} color="var(--ink-2)" size={13}>
          10.20.40.0/24, 256 adresses
        </Label>
        <Label x={BX + BW} y={22} anchor="end" mono>
          {`/${p} : blocs de ${cur.size}`}
        </Label>
        {subnets.map((sn) => (
          <g key={`${p}-${sn.index}`}>
            <rect
              x={segX(sn) + 1}
              y={34}
              width={segW(sn) - 2}
              height={44}
              rx={6}
              fill={sn.index === cur.index ? "var(--signal-wash)" : sn.index % 2 === 0 ? "var(--mist)" : "var(--surface)"}
              stroke={sn.index === cur.index ? "var(--signal)" : "var(--line-strong)"}
              strokeWidth={sn.index === cur.index ? 2 : 1}
            />
            <text x={segX(sn) + segW(sn) / 2} y={61} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--ink)">
              {sn.index + 1}
            </text>
            <text x={segX(sn) + 2} y={96} fontSize={12} fill="var(--muted)" fontFamily={MONO}>
              {`.${lastOctet(sn.network)}`}
            </text>
          </g>
        ))}
        <text x={BX + BW} y={110} textAnchor="end" fontSize={12} fill="var(--muted)" fontFamily={MONO}>
          .255
        </text>

        {/* Zoom sur le sous-réseau choisi */}
        <motion.path
          initial={false}
          animate={{ d: `M${segX(cur) + 1} 80 L${BX} 132 M${segX(cur) + segW(cur) - 1} 80 L${BX + BW} 132` }}
          transition={t}
          stroke="var(--line-strong)"
          strokeDasharray="3 3"
          fill="none"
        />
        <rect x={BX} y={134} width={92} height={56} rx={8} fill="var(--mist)" stroke="var(--line-strong)" />
        <Label x={BX + 46} y={154}>
          Réseau
        </Label>
        <text x={BX + 46} y={175} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={MONO} fill="var(--ink)">
          {`.${lastOctet(cur.network)}`}
        </text>
        <rect x={BX + 96} y={134} width={BW - 192} height={56} rx={8} fill="var(--ok-wash)" stroke="var(--ok)" />
        <Label x={260} y={154}>
          {`Plage utilisable : ${cur.size - 2} adresses`}
        </Label>
        <text x={260} y={175} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={MONO} fill="var(--ink)">
          {`${dotted(cur.first)} à ${dotted(cur.last)}`}
        </text>
        <rect x={BX + BW - 92} y={134} width={92} height={56} rx={8} fill="var(--mist)" stroke="var(--line-strong)" />
        <Label x={BX + BW - 46} y={154}>
          Diffusion
        </Label>
        <text x={BX + BW - 46} y={175} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={MONO} fill="var(--ink)">
          {`.${lastOctet(cur.broadcast)}`}
        </text>
        <text x={260} y={216} textAnchor="middle" fontSize={12} fill="var(--muted)" fontFamily={MONO}>
          {`${dotted(cur.network)}/${p}, masque ${dotted(prefixMask(p))}`}
        </text>
      </svg>
    </DiagramShell>
  );
}
