"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 40 }}>
        <h1>Une erreur inattendue est survenue.</h1>
        <p>L&apos;équipe technique a été prévenue par les journaux du serveur. Réessayez dans un instant.</p>
        <button type="button" onClick={reset}>
          Réessayer
        </button>
      </body>
    </html>
  );
}
