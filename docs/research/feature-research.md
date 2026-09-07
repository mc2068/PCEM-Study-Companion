# Feature research — PCEM Study Companion

Evidence base behind the feature ranking in `docs/scope/scope.md`.
Compiled 2026 from three pillars: learning science, competitor landscape, and the
Tunisian PCEM context. Sources are named where the claim relies on them; competitor
user numbers are marketing claims, not audited figures.

## 1. Learning science

- Practice testing (MCQs, active recall) and distributed practice (spaced repetition)
  rank highest in utility among ten study techniques; highlighting and rereading rank
  lowest. Dunlosky et al. 2013, Psychological Science in the Public Interest
  (widely cited; referenced by youlearn.ai and most modern tool guides).
- Anki (spaced repetition) usage is associated with higher standardized exam scores in
  preclinical medical students:
  - A Cohort Study Assessing the Impact of Anki as a Spaced Repetition Tool on
    Academic Performance in Medical School. Medical Science Educator 33(4), 2023.
    https://link.springer.com/article/10.1007/s40670-023-01826-8
  - Exploring the Impact of Spaced Repetition Through Anki Usage on Preclinical Exam
    Performance. J Med Educ Curric Dev, 2025.
    https://journals.sagepub.com/doi/10.1177/23821205251369705
  - Academic and Wellness Outcomes Associated with Anki use.
    https://pmc.ncbi.nlm.nih.gov/articles/PMC10176558/
- Caveat: these are cohort associations, strong evidence but not causal proof.

## 2. Competitor landscape

- TurboLearn / Turbo AI: lectures to notes, flashcards, quizzes; claims 4 to 10
  million students. https://www.turbo.ai/for-students — validates the category.
- Knowt: free Quizlet alternative with AI study modes; claims 5 million+.
  https://knowt.com/
- NotebookLM: source grounded chat; the trust feature med student guides highlight.
- Anki: the evidence king, but hostile setup (add ons, deck hunting).
- Category consensus: an all in one platform built around the student's own notes
  beats disjointed tools.
  https://www.medschoolcompanion.com/blog/best-ai-tools-medical-students-2026
- Gap we occupy: nobody offers zero setup, French first, grounded in the student's own
  faculty lectures, for Tunisian PCEM.
- Local competitor: ecnlib.tn serves DCEM and Résidanat (QCM, flashcards, AI
  assistant) https://www.ecnlib.tn/ — the niche is validated and partially occupied;
  PCEM first positioning is open.

## 3. Tunisian PCEM context

- PCEM lasts two years, taught in French, then concours, DCEM, Résidanat.
  https://fmm-rnu.tn/fr/article/710/premier-cycle-des-etudes-medicales-pcem
  → French first UI confirmed.
- synapses.tn: paid QCM and annales corrigées platform for PCEM, DCEM, Résidanat.
  https://www.synapses.tn/ → local willingness to pay for exam prep is proven.
- examanet.net plus faculty examens blancs pages: students hunt past papers across
  faculties (Tunis, Sfax, Monastir, Sousse). https://examanet.net/
- Facebook entraide groups: students actively share cours, résumés and QCM banks.
  The material circulates socially; nobody processes it into personalized study tools.
  That is the wedge.

## Decisions this evidence drove

1. Core loop is retrieval first: summary + flashcards + quiz from the student's own
   lecture PDFs.
2. Spaced repetition moved up to Slice 2 (strongest evidence; the habit engine).
3. Grounded concept chat in Slice 3 (trust differentiator vs raw ChatGPT).
4. Library after the habit features (convenience, not habit).
5. Exam mode in Slice 5 (builds on the quiz engine; matches examens blancs culture).
6. French first UI; Arabic RTL deferred.
7. Annales sharing deferred (curation and moderation burden) with a noted future
   angle: students upload annales PDFs themselves and generate practice from them.
