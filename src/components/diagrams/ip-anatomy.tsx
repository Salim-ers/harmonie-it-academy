"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ChoiceGroup, DiagramShell, Facts, Label, MONO, dotted, groupThousands, intToOctets, ipToInt, prefixMask } from "./shared";

const ADDRESS = [10, 20, 10, 87] as const;
type Prefix = "16" | "24" | "26";
const PREFIXES: Prefix[] = ["16", "24", "26"];

const bin8 = (v: number) => v.toString(2).padStart(8, "0");

/** Calcule réseau, diffusion, plage et nombre d'hôtes pour l'adresse et le préfixe donnés. */
function ipFacts(address: readonly number[], prefix: number) {
  const ip = ipToInt(address);
  const mask = prefixMask(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const hosts = prefix >= 31 ? 0 : 2 ** (32 - prefix) - 2;
  return {
    mask,
    network,
    broadcast,
    first: network + 1,
    last: broadcast - 1,
    hosts,
  };
}

const X0 = 74;
const OCT = 113;
const CELL = 11;
const PAD = 6.5;
const bitX = (i: number) => X0 + Math.floor(i / 8) * OCT + PAD + (i % 8) * CELL + CELL / 2;
function boundaryX(p: number) {
  if (p % 8 === 0) return X0 + (p / 8) * OCT - 6;
  return X0 + Math.floor(p / 8) * OCT + PAD + (p % 8) * CELL;
}

export default function IpAnatomyDiagram() {
  const reduced = Boolean(useReducedMotion());
  const [prefix, setPrefix] = useState<Prefix>("24");
  const p = Number(prefix);
  const f = ipFacts(ADDRESS, p);
  const maskOct = intToOctets(f.mask);
  const bx = boundaryX(p);
  const gateway = f.first;
  const t = { duration: reduced ? 0 : 0.5, ease: "easeInOut" as const };

  const row = (y: number, octets: number[], caption: string) => (
    <g>
      <Label x={14} y={y + 26} anchor="start" weight={600} color="var(--ink-2)">
        {caption}
      </Label>
      {octets.map((v, o) => {
        const firstBit = o * 8;
        const allNet = firstBit + 8 <= p;
        const allHost = firstBit >= p;
        return (
          <g key={o}>
            <rect
              x={X0 + o * OCT}
              y={y}
              width={OCT - 12}
              height={58}
              rx={8}
              fill={allNet ? "var(--signal-wash)" : allHost ? "var(--ok-wash)" : "var(--surface)"}
              stroke="var(--line-strong)"
              className="motion-safe:transition-colors motion-safe:duration-300"
            />
            <text
              x={X0 + o * OCT + (OCT - 12) / 2}
              y={y + 23}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fontFamily={MONO}
              fill={allNet ? "var(--signal)" : allHost ? "var(--ok)" : "var(--ink)"}
            >
              {v}
            </text>
            {bin8(v)
              .split("")
              .map((b, i) => {
                const idx = firstBit + i;
                const net = idx < p;
                return (
                  <text key={i} x={bitX(idx)} y={y + 46} textAnchor="middle" fontSize={12} fontFamily={MONO} fill={net ? "var(--signal)" : "var(--ok)"} fontWeight={net ? 600 : undefined}>
                    {b}
                  </text>
                );
              })}
          </g>
        );
      })}
    </g>
  );

  return (
    <DiagramShell
      title={`Anatomie de l'adresse 10.20.10.87/${p} : partie réseau, partie hôte, masque, passerelle et diffusion`}
      controls={
        <div>
          <ChoiceGroup
            label="Longueur du préfixe"
            options={PREFIXES.map((id) => ({ id, label: `/${id}` }))}
            value={prefix}
            onChange={setPrefix}
          />
          <div aria-live="polite" className="mt-3 rounded-[var(--radius-control)] bg-mist px-3 py-2.5 text-sm text-ink-2">
            <p className="mb-1.5 font-medium text-ink">
              10.20.10.87/{p} : {p} bits de réseau, {32 - p} bits d&apos;hôte
            </p>
            <Facts
              items={[
                { term: "Masque", value: `${dotted(f.mask)}`, mono: true },
                { term: "Masque en binaire", value: maskOct.map(bin8).join("."), mono: true },
                { term: "Adresse réseau", value: dotted(f.network), mono: true },
                { term: "Passerelle", value: `${dotted(gateway)} (par convention, la première adresse utilisable)`, mono: false },
                { term: "Plage utilisable", value: `${dotted(f.first)} à ${dotted(f.last)}`, mono: true },
                { term: "Diffusion", value: dotted(f.broadcast), mono: true },
                { term: "Hôtes possibles", value: `${groupThousands(f.hosts)} (2 puissance ${32 - p}, moins 2)` },
              ]}
            />
          </div>
        </div>
      }
    >
      <svg viewBox="0 0 520 300" className="h-auto w-full" aria-hidden="true">
        {/* Étiquettes réseau / hôte */}
        <motion.g initial={false} animate={{ opacity: 1 }}>
          <motion.line initial={false} animate={{ x2: bx - 4 }} x1={X0} y1={26} y2={26} stroke="var(--signal)" strokeWidth={2} transition={t} />
          <motion.line initial={false} animate={{ x1: bx + 4 }} x2={X0 + 4 * OCT - 12} y1={26} y2={26} stroke="var(--ok)" strokeWidth={2} transition={t} />
          <motion.text initial={false} animate={{ x: (X0 + bx) / 2 }} y={18} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--signal)" transition={t}>
            {`Réseau : ${p} bits`}
          </motion.text>
          <motion.text initial={false} animate={{ x: Math.min(466, (bx + X0 + 4 * OCT - 12) / 2) }} y={18} textAnchor="middle" fontSize={12} fontWeight={600} fill="var(--ok)" transition={t}>
            {`Hôte : ${32 - p} bits`}
          </motion.text>
        </motion.g>

        {row(38, [...ADDRESS], "Adresse")}
        {row(110, maskOct, "Masque")}

        <motion.line initial={false} animate={{ x1: bx, x2: bx }} y1={32} y2={176} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 3" transition={t} />

        {/* Résultats */}
        {[
          { k: "Réseau", v: dotted(f.network), x: 92 },
          { k: "Passerelle", v: dotted(gateway), x: 260 },
          { k: "Diffusion", v: dotted(f.broadcast), x: 428 },
        ].map((r) => (
          <g key={r.k}>
            <rect x={r.x - 76} y={204} width={152} height={56} rx={10} fill="var(--surface)" stroke="var(--line-strong)" />
            <Label x={r.x} y={225}>
              {r.k}
            </Label>
            <text x={r.x} y={246} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily={MONO} fill="var(--ink)">
              {r.v}
            </text>
          </g>
        ))}
        <Label x={260} y={284}>
          {`${groupThousands(f.hosts)} adresses utilisables, de ${dotted(f.first)} à ${dotted(f.last)}`}
        </Label>
      </svg>
    </DiagramShell>
  );
}
