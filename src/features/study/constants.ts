// Spec 0004 constants — single source for pipeline numbers and French copy.
// Retuning any of these is a spec 0004 update, not a code tweak.

// ── Pipeline constants ────────────────────────────────────────────

export const CHUNK_PAGES = 5; // pages per chunk (prepare worker plan)
export const MAX_CHUNKS = 12; // 60 pages ceiling (upload refusal)
export const MAX_FILE_SIZE_BYTES = 26_214_400; // 25 MB (bucket cap, spec 0001)
export const MAX_CARDS_PER_CHUNK = 20;
export const MAX_QUESTIONS_PER_CHUNK = 5;
export const DAILY_UPLOAD_CAP = 10; // per student, local day (spec 0002 quota)
export const GEMINI_MODEL = "gemini-3.6-flash" as const; // 2.5-flash closed to new keys (API-driven spec correction)
export const GEMINI_TIMEOUT_MS = 50_000; // under the ~60 s function limit
export const QSTASH_RETRIES = 3;
export const STUCK_CHUNK_MS = 10 * 60_000; // chunk processing over 10 min → failed on read
export const STUCK_ZERO_PROGRESS_MS = 10 * 60_000; // processing lecture, 0 chunks done
export const STUCK_UPLOADED_MS = 30 * 60_000; // abandoned before finalize
export const PROGRESS_POLL_MS = 5_000; // lecture page polling while processing
export const PRESIGN_EXPIRES_SECONDS = 600; // presigned PUT URL lifetime

// ── SM 2 constants (spec 0004; review slice may retune via spec update) ──

export const SM2 = {
  easeInitial: 2.5,
  easeFloor: 1.3,
  intervalMaxDays: 365,
  lapseEasePenalty: 0.2,
  hardEasePenalty: 0.15,
  hardFactor: 1.2,
  easyFactor: 1.3,
  againMinutes: 10,
  first: { againMinutes: 10, hardDays: 1, goodDays: 3, easyDays: 7 },
} as const;

// ── Default module ────────────────────────────────────────────────

export const DEFAULT_MODULE_NAME = "Cours généraux";

// ── French copy (all student visible strings) ─────────────────────

export const COPY = {
  appName: "PCEM Study Companion",
  homeTitle: "Aujourd'hui",
  homeGreeting: "Bon retour à tes cours",
  cardsDueLabel: "Cartes à revoir",
  newLectureCta: "Nouvelle lecture à traiter",
  uploadTitle: "Ajouter un cours",
  uploadDropzone: "Dépose ton PDF de cours ici",
  uploadBrowse: "ou clique pour choisir un fichier",
  uploadModuleLabel: "Matière",
  uploadSubmit: "Envoyer le cours",
  uploadProcessing: "Traitement en cours…",
  uploadDone: "Cours ajouté",
  disclosure: "Le contenu envoyé peut être utilisé par Google (forfait gratuit Gemini).",
  errTooBig: "Fichier trop volumineux (25 Mo max).",
  errNotPdf: "Format PDF requis.",
  errTooLong: "Cours trop long (60 pages max).",
  errCap: "Limite quotidienne d'uploads atteinte (10 par jour).",
  errGeneric: "Une erreur est survenue. Réessaie.",
  stateUploaded: "En attente",
  stateProcessing: "Traitement en cours…",
  stateReady: "Prêt à réviser",
  stateFailed: "Échec du traitement",
  retryAction: "Relancer le traitement",
  progressLabel: "Analyse du cours",
  summaryTab: "Résumé",
  flashcardsTab: "Flashcards",
  quizTab: "Quiz",
  chatTab: "Chat",
  chatSoon: "Le chat arrive dans une prochaine mise à jour.",
  keyConceptsTitle: "Concepts clés",
  noSummaryYet: "Le résumé apparaîtra ici dès que l'analyse sera terminée.",
  revealCard: "Révéler",
  gradeAgain: "À revoir",
  gradeHard: "Difficile",
  gradeGood: "Acquis",
  gradeEasy: "Facile",
  quizCounter: (n: number, total: number) => `Question ${n} sur ${total}`,
  quizValidate: "Valider",
  quizNext: "Question suivante",
  quizCorrect: "Bonne réponse !",
  quizWrong: "Pas tout à fait…",
  quizExplanation: "Explication",
  quizDone: "Quiz terminé, bravo !",
  navHome: "Accueil",
  navLibrary: "Bibliothèque",
  navExams: "Examens",
  navProfile: "Profil",
  soonBadge: "Bientôt",
  noLecturesTitle: "Aucun cours pour l'instant",
  noLecturesBody: "Ajoute ton premier cours pour lancer ta révision.",
  emptyCards: "Aucune flashcard pour ce cours.",
  emptyQuiz: "Aucune question pour ce cours.",
  streakLabel: "jours d'affilée",
  errorTitle: "Oups",
} as const;
