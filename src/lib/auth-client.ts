"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/** Client d'authentification (navigateur). Toutes les vérifications restent faites par le serveur. */
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "Adresse e-mail ou mot de passe incorrect.",
  EMAIL_NOT_VERIFIED: "Confirmez d'abord votre adresse e-mail : un nouveau lien vient de vous être envoyé.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit contenir au moins 12 caractères.",
  INVALID_TOKEN: "Ce lien n'est plus valable. Demandez-en un nouveau.",
  INVALID_TWO_FACTOR_CODE: "Code incorrect. Vérifiez l'heure de votre téléphone et réessayez.",
  INVALID_CODE: "Code incorrect.",
  TOO_MANY_REQUESTS: "Trop de tentatives. Patientez une minute avant de réessayer.",
  FAILED_TO_CREATE_SESSION: "Connexion impossible pour ce compte. Contactez le support si le problème persiste.",
};

export function authErrorMessage(err: { code?: string; status?: number; message?: string } | null | undefined) {
  if (!err) return "Une erreur est survenue.";
  if (err.status === 429) return MESSAGES.TOO_MANY_REQUESTS;
  if (err.code && MESSAGES[err.code]) return MESSAGES[err.code];
  return "La demande n'a pas abouti. Vérifiez les informations saisies et réessayez.";
}
