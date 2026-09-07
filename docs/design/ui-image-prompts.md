# UI image prompts — generate design references with GPT Image (or any image model)

How this fits the workflow: at `/develop` time for each UI feature, you hand the agent a
**reference image** and it copies the design faithfully. These prompts produce those
images. Generate 2 or 3 variants per page, keep the one you love, save it as
`docs/design/references/<page>.png`. The first approved image becomes the seed of
`design.md`; the real colors and sizes then live in the project CSS.

**Usage**: every prompt below = paste the STYLE BLOCK first, then the page prompt.
Generate desktop (16:10) for every page; add the mobile variant (9:16) for Home,
Flashcards and Quiz, since students study on phones.

**Tip**: image models garble long text. The prompts deliberately ask for short French
labels only. Do not ask for paragraphs in the mockup.

---

## The style block (paste this at the start of EVERY prompt)

```
Modern web app UI design for a medical study companion used by French-speaking
medical students in Tunisia. Calm, focused, distraction-free study atmosphere.
Clean sans-serif typography, generous whitespace, soft rounded corners, subtle
shadows, flat design. Color palette: deep indigo primary, warm amber accent for
streaks and motivation, sage green for success, gentle red for errors, warm
off-white background, dark slate text. Light mode. Minimal and professional with
a slight warmth, in the spirit of Notion, Linear and a calm Duolingo. All visible
UI text in French, short labels only. No 3D, no stock photos, no people, no
watermarks. [PAGE DETAILS BELOW]
```

---

## 0. Design system sheet (generate this one FIRST — it sets the DNA)

> …style block + A design system style tile on one page: color swatches with hex-like chips, the primary and accent buttons, an input field, a card, a toggle, tabs, a progress bar, a streak flame badge, and the heading hierarchy from large title to caption. Grid arrangement, labeled in French (Bouton, Champ, Carte, Onglets, Progression).

## 1. Sign in / Sign up (Slice 1)

> …style block + A centered authentication screen: small logo mark above, a welcoming headline in French ("Bon retour à tes cours"), one email field, one password field, a full-width indigo primary button ("Se connecter"), a subtle divider, and two secondary buttons for Google and email code. Soft gradient background hint, the form in a floating card.

## 2. Home / Today (the daily habit screen)

> …style block + A dashboard home screen titled "Aujourd'hui": a greeting header with a streak flame badge, a large card showing "Cartes à revoir : 24" with a green start button, a smaller card "Nouvelle lecture à traiter", and a row of module chips (Anatomie, Histologie, Biochimie). Bottom navigation bar with 4 icons (Accueil, Bibliothèque, Examens, Profil). This is the app's most important screen; make it feel welcoming and uncluttered.

## 3. Upload lecture (Slice 1 — the moment of value)

> …style block + An upload screen: a large dashed-border drop zone in the center with an upload icon and the text "Dépose ton PDF de cours ici", below it a module selector dropdown and a semester tag, and under that two example file cards showing successful uploads with green checkmarks. One card shows a processing state with a spinner and "Traitement en cours…".

## 4. Lecture page — Résumé tab (Slice 1 — the core screen)

> …style block + A lecture reading page: left sidebar with the module tree, main area showing a lecture title "Anatomie du cœur", a summary with clear section headings, short explanation paragraphs, and highlighted key-concept callout boxes with an indigo left border. Top tabs: "Résumé", "Flashcards", "Quiz", "Chat". A subtle "Voir dans le PDF" link style on one heading.

## 5. Flashcard study view (Slice 1)

> …style block + A focused flashcard study screen: one large card centered showing a question "Quelles sont les valves du cœur ?", a "Révéler" button, and a progress bar above ("12 / 40"). Below the card, four grade buttons in a row: "À revoir" (red), "Difficile" (amber), "Acquis" (green), "Facile" (indigo). Minimal everything else; dark mode variant if possible.

## 6. Quiz view (Slice 1)

> …style block + A quiz screen: question counter at top ("Question 3 sur 10"), a question card "Quel vaisseau porte le sang oxygéné…", four answer option rows labeled A to D, one selected with indigo border. A bottom bar with a "Valider" primary button and a timer chip "12:34". Clean, exam-like but friendly.

## 7. Library (Slice 4)

> …style block + A library screen: a semester switcher at top (Semestre 1, Semestre 2), a grid of module cards, each card showing a module name (Anatomie, Histologie, Biophysique), a lecture count badge, and a small coverage progress ring. One card is in an empty state with "Aucun cours pour l'instant" and a small upload button.

## 8. Concept chat (Slice 3)

> …style block + A lecture page with a chat side panel open on the right: the chat shows a student question "Explique-moi la circulation coronaire simplement" and a short grounded answer with a small source chip "Source : section 2.3". Input field at the bottom with a send icon. The panel feels attached to the lecture, not a separate screen.

## 9. Exam mode (Slice 5)

> …style block + An exam screen in focused mode: a slim top bar with a countdown timer "45:00" and progress "12/40", a question card with four options, a question palette grid of numbered squares on the right (answered in green, flagged in amber, current in indigo). No navigation away; serious exam atmosphere but on-brand.

## 10. Exam results (Slice 5)

> …style block + An exam results screen: a large circular score gauge "78%" in green at top, below it a summary row (correct, wrong, skipped), then a list of question review rows, each with the question snippet, the student's answer vs the correct answer, and a short explanation collapsed under a chevron. A "Revoir mes erreurs" secondary button.

## 11. Progress dashboard (Slice 6)

> …style block + A progress dashboard: a streak calendar heatmap strip at top, three stat cards (Cartes maîtrisées, Série actuelle, Modules couverts), a bar chart of weekly reviews, and a "Points faibles" list ranking two weak modules with small red indicators. Motivating but honest, not gamified to the point of noise.

## 12. Settings / Profile

> …style block + A settings page: account section with avatar and name, a usage section showing a progress bar "10 / 25 générations aujourd'hui" with the label "Quota gratuit", a theme toggle, language row (Français), and a danger zone card with a red "Supprimer mon compte" button. Calm, spacious, honest.

---

## After generating

1. Pick the winners, save into `docs/design/references/` with the page names above.
2. Look at them all together: if they disagree with each other, regenerate — one product, one look.
3. When we scaffold, these images + the design-system tile become `design.md` (the workflow extracts rules from what you approved; CSS carries the real values).
