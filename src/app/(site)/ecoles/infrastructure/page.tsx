import { PageIntro } from "@/components/marketing/page-intro";
import { Badge } from "@/components/ui/misc";

export const metadata = { title: "Infrastructure et cybersécurité", description: "Programme de l'école Administration systèmes, réseaux et cybersécurité défensive d'Harmonie IT Academy." };

const TRACKS = [
  { title: "Administrateur systèmes Windows", items: ["Windows Server, rôles et fonctionnalités", "AD DS, DNS, DHCP, GPO, délégation", "Serveurs de fichiers, NTFS, DFS, RDS", "WSUS, Hyper-V, sauvegardes, PKI", "PowerShell, supervision, PRA/PCA, durcissement"] },
  { title: "Administrateur systèmes Linux", items: ["Debian, Ubuntu Server, RHEL", "Terminal, Bash, permissions, systemd", "SSH, réseau, paquets, LVM", "Nginx, Apache, DNS, DHCP, VPN, certificats", "Journaux, sauvegardes, monitoring, durcissement"] },
  { title: "Administrateur réseaux", items: ["TCP/IP, IPv4, IPv6, sous-réseaux", "Switching : VLAN, 802.1Q, STP, LACP", "Routage statique, OSPF, BGP (introduction), NAT, ACL", "VPN, DMZ, pare-feu, haute disponibilité", "Projet : réseau d'une PME sur trois bâtiments"] },
  { title: "Cybersécurité défensive", items: ["Fondamentaux, analyse de risque, identités, MFA", "Durcissement Windows, Linux et Active Directory", "SIEM, EDR, journaux, supervision de sécurité", "Gestion des vulnérabilités en laboratoire autorisé", "Réponse à incident, sauvegardes et rançongiciels"] },
  { title: "Cloud et DevOps", items: ["AWS, Microsoft Azure, notions Google Cloud", "Git, CI/CD, Docker, Kubernetes", "Terraform, Ansible", "Sécurité du cloud, automatisation Python et Bash"] },
];

export default function InfraSchool() {
  return (
    <>
      <PageIntro title="Infrastructure, réseaux et cybersécurité">
        Le programme de la deuxième école. Aucune de ces formations n&apos;est encore ouverte : elles seront publiées module par module, après relecture technique et pédagogique. Les
        laboratoires de sécurité se dérouleront exclusivement dans des environnements isolés et autorisés.
      </PageIntro>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <ul className="divide-y divide-line border-y border-line">
          {TRACKS.map((t) => (
            <li key={t.title} className="grid gap-3 py-7 md:grid-cols-[320px_1fr] md:gap-10">
              <div>
                <p className="text-lg font-semibold tracking-tight">{t.title}</p>
                <Badge tone="warn" className="mt-2">
                  En préparation
                </Badge>
              </div>
              <ul className="grid gap-x-8 gap-y-2 text-[15px] text-ink-2 sm:grid-cols-2">
                {t.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
