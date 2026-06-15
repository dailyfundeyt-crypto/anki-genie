import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Image as ImageIcon, Loader2, Plus, Save, Sparkles, Trash2, Upload, X } from "lucide-react";
import { cardsToCsv, downloadCsv, type Card } from "@/lib/csv";
import { addToHistory, loadHistory, removeFromHistory, type VocabSet } from "@/lib/history";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Spanish → Anki CSV Generator" },
      {
        name: "description",
        content:
          "Generate Anki-ready Spanish ↔ German flashcards (CSV) from text or images using AI.",
      },
      { property: "og:title", content: "Spanish → Anki CSV Generator" },
      {
        property: "og:description",
        content: "Turn Spanish text or photos into Anki flashcards in seconds.",
      },
    ],
  }),
  component: Home,
});

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function Home() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<VocabSet[]>([]);
  const [setName, setSetName] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const urls = await Promise.all(files.map(fileToDataUrl));
    setImages((prev) => [...prev, ...urls]);
    e.target.value = "";
  }

  async function handleTextFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const content = await fileToText(file);
    setText((prev) => (prev ? prev + "\n\n" + content : content));
    e.target.value = "";
  }

  async function generate() {
    if (!text.trim() && images.length === 0) {
      toast.error("Add some Spanish text or an image first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/extract-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, images }),
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(msg || `Request failed (${res.status})`);
        return;
      }
      const data = (await res.json()) as { cards: Card[] };
      setCards(data.cards ?? []);
      if (!data.cards?.length) {
        toast.message("No vocabulary found.");
      } else {
        toast.success(`Extracted ${data.cards.length} cards.`);
      }
    } catch (err) {
      toast.error((err as Error).message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  function updateCard(i: number, key: keyof Card, value: string) {
    setCards((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));
  }
  function removeCard(i: number) {
    setCards((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addCard() {
    setCards((prev) => [...prev, { spanish: "", german: "" }]);
  }

  function exportCsv() {
    if (!cards.length) return;
    const name = (setName.trim() || "vocab") + ".csv";
    downloadCsv(name, cardsToCsv(cards));
  }

  function save() {
    if (!cards.length) return;
    const set: VocabSet = {
      id: crypto.randomUUID(),
      name: setName.trim() || `Set ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      cards,
    };
    addToHistory(set);
    setHistory(loadHistory());
    toast.success("Saved to history.");
  }

  function loadSet(s: VocabSet) {
    setCards(s.cards);
    setSetName(s.name);
    setText("");
    setImages([]);
    toast.message(`Loaded "${s.name}".`);
  }

  function deleteSet(id: string) {
    removeFromHistory(id);
    setHistory(loadHistory());
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              Spanish → Anki CSV Generator
            </h1>
            <p className="text-xs text-muted-foreground">
              Paste Spanish text or drop in an image. Get Anki-ready flashcards.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <UICard>
            <CardContent className="space-y-4 pt-6">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste Spanish text here…"
                className="min-h-[160px] resize-y"
              />

              {images.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {images.map((src, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-md border">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute right-0 top-0 rounded-bl-md bg-background/90 p-0.5 text-foreground hover:bg-background"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Add image
                </Button>
                <input
                  ref={textInputRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={handleTextFile}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => textInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload .txt
                </Button>

                <div className="ml-auto">
                  <Button onClick={generate} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate cards
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </UICard>

          {cards.length > 0 && (
            <UICard>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="Set name (e.g. Chapter 3)"
                    className="max-w-xs"
                  />
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={addCard}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add row
                    </Button>
                    <Button variant="outline" size="sm" onClick={save}>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button size="sm" onClick={exportCsv}>
                      <Download className="mr-2 h-4 w-4" />
                      Download CSV
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">Spanish</TableHead>
                        <TableHead className="w-1/2">German</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input
                              value={c.spanish}
                              onChange={(e) => updateCard(i, "spanish", e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={c.german}
                              onChange={(e) => updateCard(i, "german", e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeCard(i)}
                              aria-label="Delete row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  CSV uses <code>;</code> as separator. In Anki: <em>File → Import</em>,
                  set Field separator to Semicolon.
                </p>
              </CardContent>
            </UICard>
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="px-1 text-sm font-semibold">History</h2>
          {history.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">
              Saved sets appear here. Stored only in this browser.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((s) => (
                <li
                  key={s.id}
                  className="group rounded-md border bg-card p-3 text-sm hover:bg-accent"
                >
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => loadSet(s)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium leading-tight">{s.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {s.cards.length} cards · {new Date(s.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSet(s.id)}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground group-hover:opacity-100"
                      aria-label="Delete set"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>
    </div>
  );
}
