#!/usr/bin/env python3
"""
Audit d'une archive de ressources pédagogiques SANS extraction ni exécution.

    python3 -I scripts/audit-archive.py "OC 123.zip" > rapport.md

- Inventaire : arborescence, types de fichiers, tailles, thèmes techniques repérés.
- Sécurité : traversée de chemin, chemins absolus, liens symboliques, taux de compression
  anormal (bombe ZIP), archives imbriquées (inventoriées en mémoire, profondeur limitée).
- Données sensibles : mots de passe, clés privées, jetons, clés d'API, adresses e-mail et IP.
  Le rapport n'affiche JAMAIS la valeur d'un secret : seulement le fichier, la ligne et le type.

Le contenu n'est jamais écrit sur disque. Aucun script de l'archive n'est exécuté.
"""
from __future__ import annotations

import io
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import PurePosixPath

MAX_ENTRY_BYTES = 25 * 1024 * 1024
MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024
MAX_RATIO = 200
MAX_DEPTH = 3
TEXT_EXT = {".txt", ".md", ".ps1", ".psm1", ".bat", ".cmd", ".sh", ".py", ".conf", ".cfg", ".ini", ".yml", ".yaml", ".json", ".xml", ".csv", ".log", ".html", ".htm", ".php", ".js", ".ts", ".env", ".sql", ".ovpn", ".rsc", ".pkt.txt", ""}

SECRET_PATTERNS = [
    ("clé privée", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----")),
    ("mot de passe en clair", re.compile(r"(?i)\b(pass(?:word|wd)?|mot ?de ?passe|mdp|pwd|secret)\b\s*[:=]\s*\S{3,}")),
    ("jeton ou clé d'API", re.compile(r"(?i)\b(api[_-]?key|token|bearer|client[_-]?secret)\b\s*[:=]\s*\S{8,}")),
    ("clé AWS", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("jeton GitHub", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("clé Stripe", re.compile(r"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{10,}\b")),
    ("hash Cisco (enable secret)", re.compile(r"(?i)\benable (?:secret|password)\s+\d?\s*\S+")),
    ("chaîne de connexion", re.compile(r"(?i)\b(?:postgres|mysql|mongodb|sqlserver)://[^\s:]+:[^\s@]+@")),
]
EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
IPV4 = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
PRIVATE = re.compile(r"^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.)")
THEMES = {
    "GLPI": r"glpi", "Active Directory": r"active directory|\bad ds\b|\bgpo\b|\bntds", "Linux": r"\blinux|debian|ubuntu|systemd|\bssh\b",
    "Windows Server": r"windows server|hyper-v|wsus", "Réseau / VLAN": r"\bvlan|switchport|trunk|802\.1q", "Routage": r"\bospf|\bbgp|ip route|routage",
    "VPN": r"\bvpn|ipsec|openvpn|wireguard", "Pare-feu": r"pfsense|fortigate|iptables|nftables|pare-feu|firewall", "Supervision": r"zabbix|nagios|centreon|grafana|prometheus",
    "Sauvegarde": r"veeam|sauvegarde|backup|restic|borg", "Virtualisation": r"proxmox|vmware|esxi|virtualbox", "Sécurité / vulnérabilités": r"nessus|openvas|nmap|metasploit|vuln|cve-",
}


def safe_name(name: str) -> list[str]:
    issues = []
    p = PurePosixPath(name.replace("\\", "/"))
    if name.startswith(("/", "\\")) or re.match(r"^[A-Za-z]:", name):
        issues.append("chemin absolu")
    if ".." in p.parts:
        issues.append("traversée de chemin (..)")
    return issues


def scan_archive(data: bytes, label: str, depth: int, report: dict) -> None:
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        report["errors"].append(f"{label} : archive illisible")
        return
    for info in zf.infolist():
        path = f"{label}/{info.filename}" if label else info.filename
        if info.is_dir():
            continue
        report["files"] += 1
        report["bytes"] += info.file_size
        ext = PurePosixPath(info.filename).suffix.lower()
        report["types"][ext or "(sans extension)"] += 1
        report["top"][path.split("/")[0] if not label else label.split("/")[0]] += 1
        for issue in safe_name(info.filename):
            report["danger"].append(f"{path} : {issue}")
        if (info.external_attr >> 16) & 0o170000 == 0o120000:
            report["danger"].append(f"{path} : lien symbolique")
        if info.compress_size and info.file_size / max(1, info.compress_size) > MAX_RATIO:
            report["danger"].append(f"{path} : taux de compression anormal ({info.file_size // max(1, info.compress_size)}x)")
            continue
        if info.file_size > MAX_ENTRY_BYTES or report["bytes"] > MAX_TOTAL_BYTES:
            report["skipped"].append(f"{path} ({info.file_size // 1024} Ko) : trop volumineux pour être analysé")
            continue
        if ext in {".exe", ".msi", ".dll", ".scr", ".vbs", ".jar", ".ps1", ".bat", ".cmd", ".sh"}:
            report["scripts"].append(path)
        if ext in {".zip"}:
            if depth >= MAX_DEPTH:
                report["danger"].append(f"{path} : archive imbriquée trop profonde (non analysée)")
            else:
                scan_archive(zf.read(info), path, depth + 1, report)
            continue
        if ext in {".7z", ".rar", ".tar", ".gz", ".tgz"}:
            report["skipped"].append(f"{path} : archive non ZIP à analyser séparément")
            continue
        if ext in {".pdf", ".docx", ".pptx", ".xlsx", ".pkt", ".png", ".jpg", ".jpeg"}:
            report["documents"].append(path)
            if ext in {".png", ".jpg", ".jpeg"}:
                report["sensitive"]["capture d'écran (vérifier visuellement : noms, IP, mots de passe)"].append(path)
            continue
        if ext not in TEXT_EXT:
            continue
        try:
            text = zf.read(info).decode("utf-8", errors="replace")
        except Exception as e:  # noqa: BLE001
            report["errors"].append(f"{path} : lecture impossible ({e.__class__.__name__})")
            continue
        low = text.lower()
        for theme, rx in THEMES.items():
            if re.search(rx, low):
                report["themes"][theme] += 1
        for n, line in enumerate(text.splitlines(), 1):
            for kind, rx in SECRET_PATTERNS:
                if rx.search(line):
                    report["sensitive"][kind].append(f"{path}:{n}")
            if EMAIL.search(line):
                report["sensitive"]["adresse e-mail"].append(f"{path}:{n}")
            for ip in IPV4.findall(line):
                if all(0 <= int(o) <= 255 for o in ip.split(".")) and not ip.startswith(("255.", "0.")):
                    report["sensitive"]["adresse IP privée" if PRIVATE.match(ip) else "adresse IP publique"].append(f"{path}:{n}")


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    src = sys.argv[1]
    with open(src, "rb") as f:
        data = f.read()
    report = {"files": 0, "bytes": 0, "types": Counter(), "top": Counter(), "themes": Counter(), "danger": [], "skipped": [], "scripts": [], "documents": [], "errors": [], "sensitive": defaultdict(list)}
    scan_archive(data, "", 0, report)
    print(f"# Audit de l'archive « {src} »\n")
    print(f"- Fichiers : {report['files']}\n- Volume décompressé : {report['bytes'] // (1024 * 1024)} Mo\n")
    print("## Répartition\n")
    for k, v in report["top"].most_common(30):
        print(f"- {k} : {v} fichier(s)")
    print("\n## Types de fichiers\n")
    for k, v in report["types"].most_common():
        print(f"- {k} : {v}")
    print("\n## Thèmes techniques repérés (fichiers texte)\n")
    for k, v in report["themes"].most_common():
        print(f"- {k} : {v} fichier(s)")
    print("\n## Risques structurels\n")
    for x in report["danger"] or ["Aucun"]:
        print(f"- {x}")
    print("\n## Scripts et exécutables (à ne jamais exécuter tels quels)\n")
    for x in report["scripts"] or ["Aucun"]:
        print(f"- {x}")
    print("\n## Données potentiellement sensibles (valeurs masquées)\n")
    if not report["sensitive"]:
        print("- Aucune détectée (un contrôle visuel des captures reste nécessaire)")
    for kind, locs in report["sensitive"].items():
        print(f"- **{kind}** : {len(locs)} occurrence(s), ex. {', '.join(locs[:5])}{'…' if len(locs) > 5 else ''}")
    print("\n## Non analysé\n")
    for x in (report["skipped"] + report["errors"]) or ["Rien"]:
        print(f"- {x}")
    print("\n## Règles de réutilisation\n")
    print("- Ne rien publier tel quel : ces ressources servent de référence pour écrire des contenus originaux.")
    print("- Remplacer toute donnée réelle (noms, IP, domaines, comptes) par les entreprises fictives Harmonie.")
    print("- Ne pas republier de supports appartenant à un autre organisme de formation.")


if __name__ == "__main__":
    main()
