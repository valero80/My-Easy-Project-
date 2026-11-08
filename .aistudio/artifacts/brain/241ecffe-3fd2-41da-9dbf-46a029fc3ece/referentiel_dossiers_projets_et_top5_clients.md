# Artéfact 2 — Référentiel des Dossiers Projets & Analyse Top 5 Clients

## 1. Structure de Dossiers Dédiée par Projet (Onglet « Dossiers »)
Chaque projet enregistré dans **My Easy Project** dispose automatiquement d'une structure dédiée de **4 sous-dossiers techniques normalisés** ainsi que de sous-dossiers personnalisables :

1. **`01 · Photos de Chantier & Inspections` (`site_photo`)** :
   - Téléversement par glisser-déposer de photos de chantier (`JPG`, `PNG`, `WEBP`, `SVG`) avec aperçu visuel instantané et légende technique.
2. **`02 · Plans, Schémas & PDF Techniques` (`technical_pdf`)** :
   - Classement des plans d'exécution, schémas unifilaires, notes de calcul et Dossiers des Ouvrages Exécutés (`PDF`, `DOCX`, `XLSX`).
3. **`03 · Comptes-Rendus de Réunion & PV` (`meeting_minutes`)** :
   - Téléversement ou rédaction directe de procès-verbaux de réunion de chantier et décisions contradictoires horodatées.
4. **`04 · Rapports QHSE & Annexes Techniques` (`hse_quality_report`)** :
   - Archivage des rapports d'audit qualité/sécurité, habilitations, bordereaux et chartes de conformité.

### Fonctionnalités Avancées de Gestion Documentaire :
- **Champ « Catégorie » sur les Fiches Projets** (`BTP & Génie Civil`, `Énergie & Solaire Photovoltaïque`, `Électricité, CVC & Fluides`, `Ingénierie IT, Cloud & Télécoms`, `Logistique, Supply Chain & Transport`, `Maintenance Industrielle & QHSE`, `Conseil, Audit & Prestations`) permettant de filtrer et regrouper l'arborescence des dossiers.
- **Barre de Progression de l'Espace de Stockage Utilisé** :
  - Affichage en temps réel du volume consommé (`Ko` / `Mo`), répartition par type de document et sélecteur de quota limite.
  - **Notification automatique** dès que l'espace approche de la limite (**≥ 80 %**) ou atteint le seuil critique (**≥ 95 %**).
- **Options de Tri Multicritères** :
  - Tri par **Date** (plus récents / plus anciens), **Type de document** (A → Z / Z → A) et **Taille de fichier** (plus volumineux / plus légers).
- **Générateur d'Artéfacts Intégré** :
  - Bouton **« + Générer Tous les Artéfacts du Projet »** créant et classant automatiquement les 4 pièces types dans les 4 sous-dossiers dédiés du projet actif.

---

## 2. Panneau de Synthèse Dashboard : Top 5 Clients par Valeur Totale de Projet
Positionné sur le **Tableau de Bord principal**, ce panneau synthétise en temps réel :
- **Le classement des 5 premiers clients** selon la valeur totale cumulée de leurs projets (budgets contractuels et facturations rattachées).
- **La ventilation Montant Payé (Encaissé) vs Montant Impayé (Reste à recouvrer)** pour chaque client avec :
  - Barre de progression bicolore (Émeraude = Payé / Rose = Impayé) et pourcentages exacts.
  - Graphique comparatif empilé **Recharts** (`Montant Payé` vs `Montant Impayé`).
  - Actions directes : **Isoler le client sur le Dashboard**, **Ouvrir ses Dossiers Projets**, et **Exporter l'Artéfact Excel (`.xlsx`) du Top 5 Clients**.
