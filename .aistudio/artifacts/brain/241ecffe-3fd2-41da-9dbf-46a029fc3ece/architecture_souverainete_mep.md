# Artéfact 1 — Architecture Technique & Souveraineté des Données My Easy Project

## 1. Souveraineté Numérique & Authentification Interne Exclusive
Conformément aux exigences de gouvernance et de souveraineté des données d'entreprise :
- **Suppression totale de l'authentification tierce Google OAuth** : aucune connexion via un compte Google externe n'est autorisée sur le portail d'authentification (`AuthPortal`) ni dans le moteur d'état (`App.tsx`). Toute session OAuth résiduelle est automatiquement purgée.
- **Système d'Authentification Interne Souverain My Easy Project** :
  - Identification multi-critères : E-mail professionnel, Matricule employé (`MEP-YYYY-XXXX-XX`), Numéro de téléphone ou Nom complet.
  - **Mot de passe par défaut temporaire & changement obligatoire dès la première connexion** (`mustChangePassword: true`), y compris lorsqu'un collaborateur est promu au rang de **Super-Admin** par **L'AdGenSys**.
  - **Verrouillage Mono-Terminal** (`TerminalSessionLockRecord`) avec défi OTP à 6 chiffres et validation anti-robot en cas de bascule de terminal.
  - **Contrôle des Plages Horaires de Connexion** des collaborateurs (`CollaboratorWorkScheduleConfig`) avec dérogation Super-Admin.

## 2. Chiffrement de Bout en Bout (E2EE) & Isolation Multi-Tenant
- **Chiffrement Client-Side AES-256-GCM** : les notes confidentielles des projets et les métadonnées sensibles des documents sont chiffrées de bout en bout avec empreinte d'intégrité `SHA-256` consignée dans le journal d'audit.
- **Isolation par Entreprise (`tenantId` & `ISU`)** : chaque entreprise dispose d'un espace de travail cloisonné (`projects`, `documents`, `catalog`, `warehouses`, `employees`, `payslips`, `dossiers`, `audit`).

## 3. Matrice de Gouvernance & Points d'Accès (RBAC)
| Rôle | Périmètre d'Autorité | Accès Spéciaux |
| :--- | :--- | :--- |
| **L'AdGenSys** | Gouvernance Système Globale, Promotion des Super-Admins, Cloud & Edge Vercel, Stripe & Paiements | Accès exclusif Infrastructure & Monétisation |
| **MOAS** | Master Operator & Administration SaaS, Supervision des Abonnements, Stripe & Vercel | Accès exclusif Infrastructure & Abonnements |
| **Super-Admin** | Contrôle total de son entreprise et de son réseau d'entreprises, Paramétrage des Points d'Accès, Papier Entête & Logo | Espace Privé Super-Admin dédié |
| **Collaborateurs** | Droits granulaires définis par le Super-Admin dans le module **Paramétrage des Points d'Accès** | Selon fonction, service et plages horaires |
