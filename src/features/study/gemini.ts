import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { chunkOutputSchema, mergedSummarySchema } from "./schemas";
import { GEMINI_MODEL, GEMINI_TIMEOUT_MS } from "./constants";

// All Gemini calls go through generateObject with Zod validation
// (spec 0001/0004). Per call timeout stays under the function limit.

export async function runChunkInference(pdfBytes: Uint8Array): Promise<unknown> {
  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: chunkOutputSchema,
      abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Tu es un assistant de révision pour étudiants en médecine (PCEM, Tunisie).
Voici un extrait d'un cours de médecine en français. Produis, à partir de CE TEXTE uniquement :
1. Un résumé en français simple et clair (10 à 20 phrases) du contenu de cet extrait.
2. Entre 6 et 20 flashcards (question au recto, réponse précise au verso) couvrant les notions testables.
3. Entre 2 et 5 questions de quiz à choix multiple (exactement 4 options, une seule correcte, index 0 à 3) avec une explication courte.
N'invente rien : si une notion n'est pas dans l'extrait, ne la couvre pas. Réponds en français.`,
            },
            { type: "file", data: pdfBytes, mediaType: "application/pdf" },
          ],
        },
      ],
    });
    return object;
  } catch (e) {
    throw new Error(`Chunk inference failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function runMergeInference(
  lectureTitle: string,
  fragments: string[],
): Promise<unknown> {
  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODEL),
      schema: mergedSummarySchema,
      abortSignal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      prompt: `Tu es un assistant de révision pour étudiants en médecine (PCEM).
Un cours intitulé « ${lectureTitle} » a été découpé en extraits. Voici les résumés de chaque extrait, dans l'ordre :

${fragments.map((f, i) => `— Extrait ${i + 1} —\n${f}`).join("\n\n")}

Fusionne ces extraits en UN résumé cohérent du cours complet, en français simple,
structuré pour la révision (10 à 25 phrases), puis liste les 3 à 8 concepts clés
(terms techniques courts, sans phrase). N'invente rien au-delà des extraits.`,
    });
    return object;
  } catch (e) {
    throw new Error(`Merge inference failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}
