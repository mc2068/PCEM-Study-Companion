import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { BookOpen, CheckCheck, Clock, Flame, Upload } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const metadata: Metadata = {
  title: "Système de design — PCEM Study Companion",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-text">{title}</h2>
      {children}
    </section>
  );
}

const swatches = [
  { name: "Fond", token: "background", className: "bg-background" },
  { name: "Surface", token: "surface", className: "bg-surface" },
  { name: "Surface atténuée", token: "surface-muted", className: "bg-surface-muted" },
  { name: "Texte", token: "text", className: "bg-text" },
  { name: "Texte secondaire", token: "muted-text", className: "bg-muted-text" },
  { name: "Bordure", token: "border", className: "bg-border" },
  { name: "Indigo", token: "primary", className: "bg-primary" },
  { name: "Indigo teinte", token: "primary-tint", className: "bg-primary-tint" },
  { name: "Ambre", token: "accent", className: "bg-accent" },
  { name: "Ambre teinte", token: "accent-tint", className: "bg-accent-tint" },
  { name: "Sauge", token: "success", className: "bg-success" },
  { name: "Sauge teinte", token: "success-tint", className: "bg-success-tint" },
  { name: "Rouge", token: "error", className: "bg-error" },
  { name: "Rouge teinte", token: "error-tint", className: "bg-error-tint" },
];

export default async function DesignPage() {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) redirect("/sign-in");
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">Système de design</h1>
          <p className="mt-1 text-sm text-muted-text">
            Les fondations visuelles de l’app — mesure de la planche design, thème clair et sombre,
            composants de base.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Couleurs">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {swatches.map((s) => (
            <div key={s.token} className="flex flex-col gap-1.5">
              <div className={`h-14 rounded-md border border-border shadow-rest ${s.className}`} />
              <span className="text-xs font-medium text-text">{s.name}</span>
              <code className="text-[10px] text-muted-text">{s.token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typographie">
        <div className="flex flex-col gap-2">
          <p className="text-3xl font-semibold tracking-tight text-text">
            De la lecture à la révision
          </p>
          <p className="text-xl font-semibold text-text">Titre de section</p>
          <p className="text-sm text-text">
            Corps de texte — Geist Sans, taillé pour la lecture longue en français.
          </p>
          <p className="text-xs text-muted-text">Légende et métadonnées</p>
        </div>
      </Section>

      <Section title="Boutons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Se connecter</Button>
          <Button variant="accent">Créer un module</Button>
          <Button variant="secondary">Annuler</Button>
          <Button variant="ghost">Retour</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Taille sm</Button>
          <Button size="md">Taille md</Button>
          <Button size="lg">Taille lg</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button href="/design" variant="secondary">
            Lien interne
          </Button>
          <Button isLoading>Traitement en cours…</Button>
          <Button disabled>Indisponible</Button>
        </div>
      </Section>

      <Section title="Champs">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Adresse e-mail" placeholder="prenom@exemple.tn" type="email" />
          <Input label="Adresse e-mail" defaultValue="prof@" error="Adresse e-mail invalide" />
          <Select label="Module" defaultValue="anatomie">
            <option value="anatomie">Anatomie</option>
            <option value="histologie">Histologie</option>
            <option value="biochimie">Biochimie</option>
          </Select>
          <Textarea label="Tes notes" placeholder="Écris ce que tu dois retenir…" />
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="primary">PCEM 1</Badge>
          <Badge variant="success">
            <CheckCheck className="size-3.5" aria-hidden /> Acquis
          </Badge>
          <Badge variant="warning">
            <Clock className="size-3.5" aria-hidden /> À revoir
          </Badge>
          <Badge variant="danger">Expirée</Badge>
          <Badge variant="neutral">Brouillon</Badge>
          <Badge variant="warning">
            <Flame className="size-3.5" aria-hidden /> 7 jours
          </Badge>
        </div>
      </Section>

      <Section title="Onglets">
        <Tabs defaultValue="resume">
          <TabsList>
            <TabsTrigger value="resume">Résumé</TabsTrigger>
            <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>
          <TabsContent value="resume">
            Le résumé structuré apparaît ici, généré depuis le PDF du cours.
          </TabsContent>
          <TabsContent value="flashcards">
            40 cartes à réviser aujourd’hui, tirées du même cours.
          </TabsContent>
          <TabsContent value="quiz">5 questions pour tester ta compréhension.</TabsContent>
          <TabsContent value="chat">
            Pose tes questions : les réponses citent toujours le cours.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Progression">
        <div className="flex max-w-md flex-col gap-4">
          <Progress value={30} label="Anatomie — 12 / 40 cartes" />
          <Progress label="Traitement du PDF en cours…" />
        </div>
      </Section>

      <Section title="Interrupteurs">
        <div className="flex flex-col gap-3">
          <Switch label="Activer le mode révision" defaultChecked />
          <Switch label="Sons de l’application" size="sm" />
          <Switch label="Interrupteur désactivé" disabled />
        </div>
      </Section>

      <Section title="Carte">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Anatomie — Chapitre 3</CardTitle>
                <CardDescription>12 pages · ajouté hier</CardDescription>
              </div>
              <Badge>Nouveau</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={64} label="Révision" />
          </CardContent>
          <CardFooter>
            <Button size="sm">Commencer la révision</Button>
            <Button size="sm" variant="ghost">
              <Upload className="size-4" aria-hidden /> Remplacer le PDF
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Icônes">
        <div className="flex flex-wrap items-center gap-4 text-text">
          {[
            ["BookOpen", BookOpen],
            ["Upload", Upload],
            ["Flame", Flame],
            ["CheckCheck", CheckCheck],
            ["Clock", Clock],
          ].map(([name, Icon]) => {
            const Cmp = Icon as typeof BookOpen;
            return (
              <span key={name as string} className="inline-flex items-center gap-1.5 text-sm">
                <Cmp className="size-5" aria-hidden />
                {name as string}
              </span>
            );
          })}
        </div>
      </Section>

      <footer className="border-t border-border pt-6 text-xs text-muted-text">
        Route de démonstration (spec 0003) — chaque variante vit ici, en clair et en sombre.
        design.md documente les règles.
      </footer>
    </main>
  );
}
