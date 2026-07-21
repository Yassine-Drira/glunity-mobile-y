import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en' | 'ar';

export let globalIsRTL = false;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  fr: {
    // Admin Header & Navigation
    'admin.title': 'Glu10',
    'admin.subtitle': 'Super Administrateur',
    'admin.badge': 'ANALYTICS AVANCÉES',
    'admin.syncing': 'Synchro...',
    'admin.updated_at': 'Mis à jour à',
    'tab.home': 'Accueil',
    'tab.moderation': 'Modération',
    'tab.shops': 'Boutiques',
    'tab.users': 'Membres',
    'tab.resources': 'Ressources',

    // Settings Modal
    'settings.title': 'Paramètres Admin',
    'settings.language': 'Langue / Language',
    'settings.appearance': 'Apparence / Theme',
    'settings.light': 'Clair',
    'settings.dark': 'Sombre',
    'settings.logout': 'Déconnexion Administrateur',

    // Dashboard Period Selector
    'period.title': "Période d'Analyse Analytics",
    'period.today': "Aujourd'hui",
    'period.7d': '7 derniers jours',
    'period.30d': '30 derniers jours',
    'period.3m': '3 derniers mois',
    'period.1y': '12 derniers mois',
    'period.pill_today': 'Auj.',
    'period.pill_7d': '7 jours',
    'period.pill_30d': '30 jours',
    'period.pill_3m': '3 mois',
    'period.pill_1y': '1 an',

    // Insight Banner & Section Tabs
    'insight.banner_prefix': 'Stats pour',
    'insight.registered': 'inscrits',
    'insight.created': 'contenus créés',
    'section.overview': 'Aperçu Général',
    'section.health': 'Santé & Symptômes',
    'section.engagement': 'Engagement & XP',
    'section.all': 'Vue Complète',

    // Executive KPI Cards
    'kpi.new_users': 'Inscrits',
    'kpi.total_users': 'Utilisateurs Totaux',
    'kpi.growth': 'Croissance Inscriptions',
    'kpi.notifications': 'Notifications In-App',
    'kpi.emails': 'Emails Envoyés',
    'kpi.db_status': 'Santé Base de Données',
    'kpi.db_healthy': 'Base Saine',
    'kpi.user_base': "Base d'Utilisateurs",
    'kpi.shops_sellers': 'Vendeurs & Boutiques',
    'kpi.vs_prev': 'vs fenêtre précédente',
    'kpi.pending_mod': 'en attente modération',
    'kpi.dossiers': 'dossier(s)',

    // Section Headings
    'heading.platform_health': 'Santé de la Plateforme',
    'heading.system_metrics': 'Mesures système',
    'heading.registrations_trend': 'Inscriptions au fil du temps',
    'heading.content_split': 'Répartition des Contenus',
    'heading.moderation_queue': "File d'attente de Modération",
    'heading.recent_registrations': 'Nouvelles Inscriptions',
    'heading.dau_wau_mau': "Métrique d'Activité (DAU / WAU / MAU)",
    'heading.leaderboard': 'Classement Top XP & Badges',
    'heading.engagement_gamification': 'Engagement & Gamification',
    'heading.active_performers': 'Utilisateurs Actifs & Top Performers',
    'heading.platform_activity': 'Activité de la Plateforme',
    'heading.activity_by_period': 'Activité par période',
    'heading.patient_questionnaires': 'Questionnaires Patients & Santé Cœliaque',
    'heading.clinical_analysis_sub': 'Analyses cliniques et symptômes post-ingestion de gluten',
    'heading.profile_distribution': 'Répartition des profils',

    // Roles & Legends
    'role.celiac': 'Patients Cœliaques',
    'role.seller': 'Vendeurs',
    'role.health_pro': 'Professionnels de Santé',
    'legend.registrations': 'Inscriptions',
    'legend.events': 'Événements',
    'legend.reels': 'Reels',
    'legend.moderations': 'Modérations',

    // Empty States
    'empty.no_registrations': 'Pas de nouvelles inscriptions',
    'empty.no_xp': 'Aucune donnée XP disponible',
    'empty.queue_empty': "La file d'attente est vide",
    'empty.no_recent': 'Aucune inscription récente',

    // Questionnaire Insights
    'insights.title': 'Analyse Clinique & Questionnaires Patients',
    'insights.sub': "Synthèse des symptômes déclarés, tranches d'âge et sévérité des réactions au gluten",
    'insights.surveyed': 'sondés',
    'insights.symptoms_title': "Symptômes & Rejets Suite à l'Ingestion de Gluten",
    'insights.symptoms_sub': "Pourcentage des patients cœliaques souffrant de ces troubles lors de l'exposition au gluten",
    'insights.severity_title': 'Sévérité des Réactions & Diagnostic Médical',
    'insights.severity_scale': 'Échelle de sévérité globale des réactions :',
    'insights.mild': 'Légère',
    'insights.moderate': 'Modérée',
    'insights.severe': 'Sévère',
    'insights.clinical_diagnosis': 'Diagnostic Médical Confirmé (Biopsie / Sérologie)',
    'insights.family_history': 'Antécédents Familiaux de Cœliaquie Déclarés',
    'insights.age_groups': "Tranches d'Âge",
    'insights.dietary_profiles': 'Profils Alimentaires',

    // Moderation Hub
    'mod.title': 'Centre de Modération',
    'mod.sub': 'Validation des produits, recettes, événements et reels',
    'mod.filter_all': 'Tous les éléments',
    'mod.filter_products': 'Produits',
    'mod.filter_recipes': 'Recettes',
    'mod.filter_events': 'Événements',
    'mod.filter_reels': 'Reels',
    'mod.submitted_by': 'Auteur / Vendeur :',
    'mod.submitted_date': 'Soumis :',
    'mod.approve': 'Valider & Notifier',
    'mod.reject': 'Refuser',
    'mod.empty': 'Aucun élément en attente de modération',
    'mod.see_queue': 'Voir toute la file',

    // Seller Verification Screen
    'sellers.title': 'Vérification des Vendeurs',
    'sellers.sub': 'Audit des kbis, siret, certifications et boutiques cœliaques',
    'sellers.inspect': 'Inspecter Dossier & Documents',
    'sellers.approve_badge': 'Valider & Délivrer Badge',
    'sellers.revision': 'Demander Révision',
    'sellers.reject': 'Refuser Dossier',
    'sellers.empty': 'Aucun dossier vendeur en attente de validation',

    // Members Screen
    'users.title': 'Gestion des Membres',
    'users.sub': "Consultez la liste des utilisateurs, rôles et statuts d'accès",
    'users.search': 'Rechercher par nom, email ou rôle...',
    'users.status_active': 'Actif',
    'users.status_suspended': 'Suspendu',
    'users.suspend': 'Suspendre Accès',
    'users.reactivate': 'Réactiver Compte',

    // Patient Resources
    'resources.title': 'Ressources Médicales Patients',
    'resources.sub': 'Consultez, modifiez et gérez les articles, guides PDF et vidéos de la communauté cœliaque.',
    'resources.add': '+ Nouvelle',
    'resources.search': 'Rechercher par titre, auteur...',
    'resources.filter_all': 'Toutes',
    'resources.filter_article': 'Articles',
    'resources.filter_document': 'Documents',
    'resources.filter_video': 'Vidéos',
    'resources.stat_resources': 'Ressources',
    'resources.stat_views': 'Vues Total',
    'resources.stat_clicks': 'Clics Total',
    'resources.library': 'Bibliothèque',
    'resources.views': 'vues',
    'resources.clicks': 'clics',
    'resources.by': 'Par :',
    'resources.published': 'Publié',
    'resources.draft': 'Brouillon',
    'resources.empty': 'Aucune ressource trouvée',
    'back': 'Retour',
  },
  en: {
    // Admin Header & Navigation
    'admin.title': 'Glu10',
    'admin.subtitle': 'Super Administrator',
    'admin.badge': 'ADVANCED ANALYTICS',
    'admin.syncing': 'Syncing...',
    'admin.updated_at': 'Updated at',
    'tab.home': 'Home',
    'tab.moderation': 'Moderation',
    'tab.shops': 'Shops',
    'tab.users': 'Members',
    'tab.resources': 'Resources',

    // Settings Modal
    'settings.title': 'Admin Settings',
    'settings.language': 'Language / Langue',
    'settings.appearance': 'Appearance / Theme',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.logout': 'Administrator Logout',

    // Dashboard Period Selector
    'period.title': 'Analytics Analysis Period',
    'period.today': 'Today',
    'period.7d': 'Last 7 Days',
    'period.30d': 'Last 30 Days',
    'period.3m': 'Last 3 Months',
    'period.1y': 'Last 12 Months',
    'period.pill_today': 'Today',
    'period.pill_7d': '7 Days',
    'period.pill_30d': '30 Days',
    'period.pill_3m': '3 Months',
    'period.pill_1y': '1 Year',

    // Insight Banner & Section Tabs
    'insight.banner_prefix': 'Stats for',
    'insight.registered': 'registered',
    'insight.created': 'items created',
    'section.overview': 'General Overview',
    'section.health': 'Health & Symptoms',
    'section.engagement': 'Engagement & XP',
    'section.all': 'Complete View',

    // Executive KPI Cards
    'kpi.new_users': 'New Members',
    'kpi.total_users': 'Total Users',
    'kpi.growth': 'Registration Growth',
    'kpi.notifications': 'In-App Notifications',
    'kpi.emails': 'Emails Dispatched',
    'kpi.db_status': 'Database Health',
    'kpi.db_healthy': 'Healthy Database',
    'kpi.user_base': 'User Base',
    'kpi.shops_sellers': 'Sellers & Shops',
    'kpi.vs_prev': 'vs previous period',
    'kpi.pending_mod': 'pending moderation',
    'kpi.dossiers': 'dossier(s)',

    // Section Headings
    'heading.platform_health': 'Platform System Health',
    'heading.system_metrics': 'System Metrics',
    'heading.registrations_trend': 'Registrations Over Time',
    'heading.content_split': 'Content Breakdown',
    'heading.moderation_queue': 'Moderation Queue',
    'heading.recent_registrations': 'New Registrations',
    'heading.dau_wau_mau': 'Activity Metrics (DAU / WAU / MAU)',
    'heading.leaderboard': 'Top XP & Badges Leaderboard',
    'heading.engagement_gamification': 'Engagement & Gamification',
    'heading.active_performers': 'Active Users & Top Performers',
    'heading.platform_activity': 'Platform Activity',
    'heading.activity_by_period': 'Activity by period',
    'heading.patient_questionnaires': 'Patient Surveys & Celiac Health',
    'heading.clinical_analysis_sub': 'Clinical analysis and symptoms after gluten ingestion',
    'heading.profile_distribution': 'Profile Distribution',

    // Roles & Legends
    'role.celiac': 'Celiac Patients',
    'role.seller': 'Sellers',
    'role.health_pro': 'Healthcare Professionals',
    'legend.registrations': 'Registrations',
    'legend.events': 'Events',
    'legend.reels': 'Reels',
    'legend.moderations': 'Moderations',

    // Empty States
    'empty.no_registrations': 'No new registrations',
    'empty.no_xp': 'No XP data available',
    'empty.queue_empty': 'Moderation queue is empty',
    'empty.no_recent': 'No recent registrations',

    // Questionnaire Insights
    'insights.title': 'Clinical Analysis & Patient Survey',
    'insights.sub': 'Synthesis of declared symptoms, age groups, and gluten reaction severity',
    'insights.surveyed': 'surveyed',
    'insights.symptoms_title': 'Symptoms & Reactions Following Gluten Ingestion',
    'insights.symptoms_sub': 'Percentage of celiac patients suffering from these symptoms upon gluten exposure',
    'insights.severity_title': 'Reaction Severity & Medical Diagnosis',
    'insights.severity_scale': 'Global reaction severity scale:',
    'insights.mild': 'Mild',
    'insights.moderate': 'Moderate',
    'insights.severe': 'Severe',
    'insights.clinical_diagnosis': 'Confirmed Medical Diagnosis (Biopsy / Serology)',
    'insights.family_history': 'Declared Family History of Celiac Disease',
    'insights.age_groups': 'Age Groups',
    'insights.dietary_profiles': 'Dietary Profiles',

    // Moderation Hub
    'mod.title': 'Moderation Hub',
    'mod.sub': 'Validation of products, recipes, events, and reels',
    'mod.filter_all': 'All Items',
    'mod.filter_products': 'Products',
    'mod.filter_recipes': 'Recipes',
    'mod.filter_events': 'Events',
    'mod.filter_reels': 'Reels',
    'mod.submitted_by': 'Author / Seller:',
    'mod.submitted_date': 'Submitted:',
    'mod.approve': 'Approve & Notify',
    'mod.reject': 'Reject',
    'mod.empty': 'No items pending moderation',
    'mod.see_queue': 'View Full Queue',

    // Seller Verification Screen
    'sellers.title': 'Seller Verification',
    'sellers.sub': 'Audit of business registration, SIRET, certifications, and celiac shops',
    'sellers.inspect': 'Inspect Dossier & Documents',
    'sellers.approve_badge': 'Approve & Issue Badge',
    'sellers.revision': 'Request Revision',
    'sellers.reject': 'Reject Dossier',
    'sellers.empty': 'No seller dossiers pending verification',

    // Members Screen
    'users.title': 'Member Management',
    'users.sub': 'View user list, roles, and access statuses',
    'users.search': 'Search by name, email, or role...',
    'users.status_active': 'Active',
    'users.status_suspended': 'Suspended',
    'users.suspend': 'Suspend Access',
    'users.reactivate': 'Reactivate Account',

    // Patient Resources
    'resources.title': 'Patient Medical Resources',
    'resources.sub': 'Browse, edit, and manage articles, PDF guides, and videos for the celiac community.',
    'resources.add': '+ New',
    'resources.search': 'Search by title, author...',
    'resources.filter_all': 'All',
    'resources.filter_article': 'Articles',
    'resources.filter_document': 'Documents',
    'resources.filter_video': 'Videos',
    'resources.stat_resources': 'Resources',
    'resources.stat_views': 'Total Views',
    'resources.stat_clicks': 'Total Clicks',
    'resources.library': 'Library',
    'resources.views': 'views',
    'resources.clicks': 'clicks',
    'resources.by': 'By:',
    'resources.published': 'Published',
    'resources.draft': 'Draft',
    'resources.empty': 'No resources found',
    'back': 'Back',
  },
  ar: {
    // Admin Header & Navigation
    'admin.title': 'Glu10',
    'admin.subtitle': 'Super Administrateur',
    'admin.badge': 'ANALYTICS AVANCÉES',
    'admin.syncing': 'Synchro...',
    'admin.updated_at': 'Mis à jour à',
    'tab.home': 'Accueil',
    'tab.moderation': 'Modération',
    'tab.shops': 'Boutiques',
    'tab.users': 'Membres',
    'tab.resources': 'Ressources',

    // Settings Modal
    'settings.title': 'Paramètres Admin',
    'settings.language': 'Langue / Language',
    'settings.appearance': 'Apparence / Theme',
    'settings.light': 'Clair',
    'settings.dark': 'Sombre',
    'settings.logout': 'Déconnexion Administrateur',

    // Dashboard Period Selector
    'period.title': "Période d'Analyse Analytics",
    'period.today': "Aujourd'hui",
    'period.7d': '7 derniers jours',
    'period.30d': '30 derniers jours',
    'period.3m': '3 derniers mois',
    'period.1y': '12 derniers mois',
    'period.pill_today': 'Auj.',
    'period.pill_7d': '7 jours',
    'period.pill_30d': '30 jours',
    'period.pill_3m': '3 mois',
    'period.pill_1y': '1 an',

    // Insight Banner & Section Tabs
    'insight.banner_prefix': 'Stats pour',
    'insight.registered': 'inscrits',
    'insight.created': 'contenus créés',
    'section.overview': 'Aperçu Général',
    'section.health': 'Santé & Symptômes',
    'section.engagement': 'Engagement & XP',
    'section.all': 'Vue Complète',

    // Executive KPI Cards
    'kpi.new_users': 'Inscrits',
    'kpi.total_users': 'Utilisateurs Totaux',
    'kpi.growth': 'Croissance Inscriptions',
    'kpi.notifications': 'Notifications In-App',
    'kpi.emails': 'Emails Envoyés',
    'kpi.db_status': 'Santé Base de Données',
    'kpi.db_healthy': 'Base Saine',
    'kpi.user_base': "Base d'Utilisateurs",
    'kpi.shops_sellers': 'Vendeurs & Boutiques',
    'kpi.vs_prev': 'vs fenêtre précédente',
    'kpi.pending_mod': 'en attente modération',
    'kpi.dossiers': 'dossier(s)',

    // Section Headings
    'heading.platform_health': 'Santé de la Plateforme',
    'heading.system_metrics': 'Mesures système',
    'heading.registrations_trend': 'Inscriptions au fil du temps',
    'heading.content_split': 'Répartition des Contenus',
    'heading.moderation_queue': "File d'attente de Modération",
    'heading.recent_registrations': 'Nouvelles Inscriptions',
    'heading.dau_wau_mau': "Métrique d'Activité (DAU / WAU / MAU)",
    'heading.leaderboard': 'Classement Top XP & Badges',
    'heading.engagement_gamification': 'Engagement & Gamification',
    'heading.active_performers': 'Utilisateurs Actifs & Top Performers',
    'heading.platform_activity': 'Activité de la Plateforme',
    'heading.activity_by_period': 'Activité par période',
    'heading.patient_questionnaires': 'Questionnaires Patients & Santé Cœliaque',
    'heading.clinical_analysis_sub': 'Analyses cliniques et symptômes post-ingestion de gluten',
    'heading.profile_distribution': 'Répartition des profils',

    // Roles & Legends
    'role.celiac': 'Patients Cœliaques',
    'role.seller': 'Vendeurs',
    'role.health_pro': 'Professionnels de Santé',
    'legend.registrations': 'Inscriptions',
    'legend.events': 'Événements',
    'legend.reels': 'Reels',
    'legend.moderations': 'Modérations',

    // Empty States
    'empty.no_registrations': 'Pas de nouvelles inscriptions',
    'empty.no_xp': 'Aucune donnée XP disponible',
    'empty.queue_empty': "La file d'attente est vide",
    'empty.no_recent': 'Aucune inscription récente',

    // Questionnaire Insights
    'insights.title': 'Analyse Clinique & Questionnaires Patients',
    'insights.sub': "Synthèse des symptômes déclarés, tranches d'âge et sévérité des réactions au gluten",
    'insights.surveyed': 'sondés',
    'insights.symptoms_title': "Symptômes & Rejets Suite à l'Ingestion de Gluten",
    'insights.symptoms_sub': "Pourcentage des patients cœliaques souffrant de ces troubles lors de l'exposition au gluten",
    'insights.severity_title': 'Sévérité des Réactions & Diagnostic Médical',
    'insights.severity_scale': 'Échelle de sévérité globale des réactions :',
    'insights.mild': 'Légère',
    'insights.moderate': 'Modérée',
    'insights.severe': 'Sévère',
    'insights.clinical_diagnosis': 'Diagnostic Médical Confirmé (Biopsie / Sérologie)',
    'insights.family_history': 'Antécédents Familiaux de Cœliaquie Déclarés',
    'insights.age_groups': "Tranches d'Âge",
    'insights.dietary_profiles': 'Profils Alimentaires',

    // Moderation Hub
    'mod.title': 'Centre de Modération',
    'mod.sub': 'Validation des produits, recettes, événements et reels',
    'mod.filter_all': 'Tous les éléments',
    'mod.filter_products': 'Produits',
    'mod.filter_recipes': 'Recettes',
    'mod.filter_events': 'Événements',
    'mod.filter_reels': 'Reels',
    'mod.submitted_by': 'Auteur / Vendeur :',
    'mod.submitted_date': 'Soumis :',
    'mod.approve': 'Valider & Notifier',
    'mod.reject': 'Refuser',
    'mod.empty': 'Aucun élément en attente de modération',
    'mod.see_queue': 'Voir toute la file',

    // Seller Verification Screen
    'sellers.title': 'Vérification des Vendeurs',
    'sellers.sub': 'Audit des kbis, siret, certifications et boutiques cœliaques',
    'sellers.inspect': 'Inspecter Dossier & Documents',
    'sellers.approve_badge': 'Valider & Délivrer Badge',
    'sellers.revision': 'Demander Révision',
    'sellers.reject': 'Refuser Dossier',
    'sellers.empty': 'Aucun dossier vendeur en attente de validation',

    // Members Screen
    'users.title': 'Gestion des Membres',
    'users.sub': "Consultez la liste des utilisateurs, rôles et statuts d'accès",
    'users.search': 'Rechercher par nom, email ou rôle...',
    'users.status_active': 'Actif',
    'users.status_suspended': 'Suspendu',
    'users.suspend': 'Suspendre Accès',
    'users.reactivate': 'Réactiver Compte',

    // Patient Resources
    'resources.title': 'Ressources Médicales Patients',
    'resources.sub': 'Consultez, modifiez et gérez les articles, guides PDF et vidéos de la communauté cœliaque.',
    'resources.add': '+ Nouvelle',
    'resources.search': 'Rechercher par titre, auteur...',
    'resources.filter_all': 'Toutes',
    'resources.filter_article': 'Articles',
    'resources.filter_document': 'Documents',
    'resources.filter_video': 'Vidéos',
    'resources.stat_resources': 'Ressources',
    'resources.stat_views': 'Vues Total',
    'resources.stat_clicks': 'Clics Total',
    'resources.library': 'Bibliothèque',
    'resources.views': 'vues',
    'resources.clicks': 'clics',
    'resources.by': 'Par :',
    'resources.published': 'Publié',
    'resources.draft': 'Brouillon',
    'resources.empty': 'Aucune ressource trouvée',
    'back': 'Retour',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'fr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isRTL: false,
  t: (key: string, fallback?: string) => fallback || key,
});

const STORAGE_KEY = '@glu10_admin_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'fr' || saved === 'en' || saved === 'ar') {
        setLanguageState(saved as Language);
      }
    }).catch(() => {});
  }, []);

  const isRTL = language === 'ar';
  globalIsRTL = isRTL;

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  };

  const toggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language]?.[key] || fallback || translations['fr']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isRTL, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
