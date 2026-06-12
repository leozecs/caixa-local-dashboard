import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ChevronDown,
  FileText,
  FolderPlus,
  Plus,
  Save,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  createNoteBlock,
  createNoteTopic,
  deleteNoteBlock,
  deleteNoteTopic,
  getCurrentStore,
  listNoteBlocks,
  listNoteTopics,
  updateNoteBlock,
  updateNoteTopic,
  type NoteBlock,
  type NoteTopic,
} from "@/lib/data";

export const Route = createFileRoute("/_app/anotacoes")({
  head: () => ({ meta: [{ title: "AnotaÃ§Ãµes - Caixa Local" }] }),
  component: AnotacoesPage,
});

function AnotacoesPage() {
  const queryClient = useQueryClient();
  const { session } = useSession();
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  const { data: store } = useQuery({
    queryKey: ["current-store", session?.profile.id],
    queryFn: () => getCurrentStore(session!.profile),
    enabled: Boolean(session),
  });
  const {
    data: topics = [],
    isLoading: loadingTopics,
    error: topicsError,
  } = useQuery({
    queryKey: ["note-topics", store?.id],
    queryFn: () => listNoteTopics(store!.id),
    enabled: Boolean(store?.id),
  });
  const {
    data: blocks = [],
    isLoading: loadingBlocks,
    error: blocksError,
  } = useQuery({
    queryKey: ["note-blocks", store?.id],
    queryFn: () => listNoteBlocks(store!.id),
    enabled: Boolean(store?.id),
  });

  const blocksByTopic = useMemo(() => {
    return blocks.reduce<Record<string, NoteBlock[]>>((acc, block) => {
      acc[block.topicId] = acc[block.topicId] || [];
      acc[block.topicId].push(block);
      return acc;
    }, {});
  }, [blocks]);

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey: ["note-topics", store?.id] });
    queryClient.invalidateQueries({ queryKey: ["note-blocks", store?.id] });
  };

  const createTopicMutation = useMutation({
    mutationFn: (payload: FormData) =>
      createNoteTopic({ storeId: store!.id, title: String(payload.get("title") || "") }),
    onSuccess: (topic) => {
      invalidateNotes();
      setExpandedTopicId(topic.id);
      toast.success("Tema criado.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Erro ao criar tema."),
  });
  const updateTopicMutation = useMutation({
    mutationFn: updateNoteTopic,
    onSuccess: invalidateNotes,
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar tema."),
  });
  const deleteTopicMutation = useMutation({
    mutationFn: deleteNoteTopic,
    onSuccess: () => {
      invalidateNotes();
      setExpandedTopicId(null);
      toast.success("Tema removido.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover tema."),
  });
  const createBlockMutation = useMutation({
    mutationFn: (input: { topicId: string; title: string }) =>
      createNoteBlock({ storeId: store!.id, topicId: input.topicId, title: input.title }),
    onSuccess: (block) => {
      invalidateNotes();
      setExpandedTopicId(block.topicId);
      setExpandedBlockId(block.id);
      toast.success("Bloco criado.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao criar bloco."),
  });
  const updateBlockMutation = useMutation({
    mutationFn: updateNoteBlock,
    onSuccess: () => {
      invalidateNotes();
      toast.success("AnotaÃ§Ã£o salva.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao salvar anotaÃ§Ã£o."),
  });
  const deleteBlockMutation = useMutation({
    mutationFn: deleteNoteBlock,
    onSuccess: () => {
      invalidateNotes();
      setExpandedBlockId(null);
      toast.success("Bloco removido.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Erro ao remover bloco."),
  });

  if (!store) {
    return <div className="text-sm text-muted-foreground">Nenhuma loja vinculada a sua conta.</div>;
  }

  const loadingError = topicsError || blocksError;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AnotaÃ§Ãµes"
        description="Temas e blocos de nota para registrar decisÃµes, pendÃªncias e observaÃ§Ãµes da rotina."
      />

      {loadingError ? (
        <NotesUnavailable error={loadingError} />
      ) : (
        <Card className="shadow-none">
          <CardContent className="p-4">
            <form
              className="grid gap-3 md:grid-cols-[1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                createTopicMutation.mutate(new FormData(event.currentTarget));
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5">
                <Label>Novo tema</Label>
                <Input name="title" placeholder="Ex: Fechamento, fornecedores, ideias" required />
              </div>
              <Button
                type="submit"
                className="self-end gap-2"
                disabled={createTopicMutation.isPending}
              >
                <FolderPlus className="h-4 w-4" />
                Criar tema
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loadingError ? null : loadingTopics || loadingBlocks ? (
        <div className="text-sm text-muted-foreground">Carregando anotaÃ§Ãµes...</div>
      ) : topics.length ? (
        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicPanel
              key={topic.id}
              topic={topic}
              blocks={blocksByTopic[topic.id] || []}
              expanded={expandedTopicId === topic.id}
              expandedBlockId={expandedBlockId}
              savingBlockId={updateBlockMutation.variables?.id}
              pending={
                updateTopicMutation.isPending ||
                deleteTopicMutation.isPending ||
                createBlockMutation.isPending ||
                updateBlockMutation.isPending ||
                deleteBlockMutation.isPending
              }
              onToggle={() => setExpandedTopicId(expandedTopicId === topic.id ? null : topic.id)}
              onRename={(title) => updateTopicMutation.mutate({ id: topic.id, title })}
              onDelete={() => {
                if (window.confirm(`Excluir o tema "${topic.title}" e todos os blocos?`)) {
                  deleteTopicMutation.mutate(topic.id);
                }
              }}
              onCreateBlock={(title) => createBlockMutation.mutate({ topicId: topic.id, title })}
              onToggleBlock={(blockId) =>
                setExpandedBlockId(expandedBlockId === blockId ? null : blockId)
              }
              onSaveBlock={(block) => updateBlockMutation.mutate(block)}
              onDeleteBlock={(block) => {
                if (window.confirm(`Excluir o bloco "${block.title}"?`)) {
                  deleteBlockMutation.mutate(block.id);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyNotes />
      )}
    </div>
  );
}

function NotesUnavailable({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "Nao foi possivel carregar a aba Anotacoes agora.";

  return (
    <Card className="border-warning/40 bg-warning/5 shadow-none">
      <CardContent className="flex gap-3 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <div className="text-sm font-medium">Anotacoes indisponiveis</div>
          <div className="mt-1 text-sm text-muted-foreground">{message}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopicPanel({
  topic,
  blocks,
  expanded,
  expandedBlockId,
  savingBlockId,
  pending,
  onToggle,
  onRename,
  onDelete,
  onCreateBlock,
  onToggleBlock,
  onSaveBlock,
  onDeleteBlock,
}: {
  topic: NoteTopic;
  blocks: NoteBlock[];
  expanded: boolean;
  expandedBlockId: string | null;
  savingBlockId?: string;
  pending: boolean;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  onCreateBlock: (title: string) => void;
  onToggleBlock: (blockId: string) => void;
  onSaveBlock: (block: { id: string; title: string; content: string }) => void;
  onDeleteBlock: (block: NoteBlock) => void;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            className="flex min-w-0 items-center gap-2 text-left"
            onClick={onToggle}
          >
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", !expanded && "-rotate-90")}
            />
            <StickyNote className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <CardTitle className="truncate text-sm font-semibold">{topic.title}</CardTitle>
              <div className="text-xs text-muted-foreground">
                {blocks.length} bloco(s), criado em{" "}
                {format(parseISO(topic.createdAt), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          </button>
          <div className="flex items-center gap-2">
            <Input
              defaultValue={topic.title}
              className="h-8 w-[190px]"
              disabled={pending}
              aria-label={`Renomear tema ${topic.title}`}
              onBlur={(event) => {
                const title = event.currentTarget.value.trim();
                if (title && title !== topic.title) onRename(title);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              disabled={pending}
              onClick={onDelete}
              aria-label="Excluir tema"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <form
            className="grid gap-2 md:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onCreateBlock(String(form.get("title") || ""));
              event.currentTarget.reset();
            }}
          >
            <Input name="title" placeholder="Novo bloco de nota" required />
            <Button type="submit" variant="outline" className="gap-2" disabled={pending}>
              <Plus className="h-4 w-4" />
              Bloco
            </Button>
          </form>

          <div className="space-y-2">
            {blocks.map((block) => (
              <NoteBlockPanel
                key={block.id}
                block={block}
                expanded={expandedBlockId === block.id}
                pending={pending}
                saving={savingBlockId === block.id}
                onToggle={() => onToggleBlock(block.id)}
                onSave={onSaveBlock}
                onDelete={() => onDeleteBlock(block)}
              />
            ))}
            {!blocks.length && (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhum bloco neste tema ainda.
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function NoteBlockPanel({
  block,
  expanded,
  pending,
  saving,
  onToggle,
  onSave,
  onDelete,
}: {
  block: NoteBlock;
  expanded: boolean;
  pending: boolean;
  saving: boolean;
  onToggle: () => void;
  onSave: (block: { id: string; title: string; content: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(block.title);
  const [content, setContent] = useState(block.content);

  useEffect(() => {
    setTitle(block.title);
    setContent(block.content);
  }, [block.content, block.title]);

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button type="button" className="flex min-w-0 items-center gap-2" onClick={onToggle}>
          <ChevronDown className={cn("h-4 w-4 transition-transform", !expanded && "-rotate-90")} />
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{block.title}</span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          disabled={pending}
          onClick={onDelete}
          aria-label="Excluir bloco"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded && (
        <div className="space-y-3 border-t border-border p-3">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={8}
            placeholder="Escreva aqui..."
          />
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Atualizado em{" "}
              {format(parseISO(block.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </div>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={pending || !title.trim()}
              onClick={() => onSave({ id: block.id, title, content })}
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyNotes() {
  return (
    <Card className="shadow-none">
      <CardContent className="py-14 text-center">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-muted">
          <StickyNote className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-3 text-sm font-medium">Nenhum tema criado</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Crie um tema para organizar blocos de nota por rotina, fornecedor ou decisÃ£o.
        </div>
      </CardContent>
    </Card>
  );
}
