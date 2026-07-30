# Hub de Análises · Skills and Go

Um hub coletivo para a turma do **Skills and Go** compartilhar análises, gráficos e técnicas de dados. Design minimalista estilo Notion, backend em Flask e dados no Supabase.

- **Página inicial** (estilo Substack): apresentação + CTA "Acessar Hub".
- **Hub**: grid de cards com busca, filtro por tag e botão "+ Adicionar análise".
- **Adicionar**: formulário em modal que salva direto no Supabase e aparece na hora (sem aprovação).

## Stack

- **Backend:** Flask (Python)
- **Banco:** Supabase (PostgreSQL) via API REST
- **Frontend:** HTML / CSS / JS puro
- **Deploy:** pronto para o Vercel

## Estrutura

```
.
├── api/index.py        # App Flask (entrypoint do Vercel)
├── templates/
│   ├── index.html      # landing
│   └── hub.html        # grid + modal
├── static/
│   ├── style.css
│   └── app.js
├── requirements.txt
├── vercel.json
└── .env.example
```

## Banco de dados

Tabela `public.analyses` (já criada no Supabase):

| coluna       | tipo        |
|--------------|-------------|
| id           | uuid (pk)   |
| title        | text        |
| description  | text        |
| author       | text        |
| tag          | text        |
| github_link  | text        |
| image_url    | text        |
| created_at   | timestamptz |

O RLS (Row Level Security) está ativo com políticas que permitem **leitura** e
**inserção** públicas (via chave publishable). Não há update/delete pelo cliente —
isso você gerencia direto no painel do Supabase.

Tags disponíveis: `exploratória`, `limpeza`, `visualização`, `estatística`, `clínica`.

### Imagens (upload)

As imagens são **enviadas como arquivo** (não é link) e guardadas no **Supabase
Storage**, no bucket público `analyses-images` (máx. 5 MB; PNG, JPG, WEBP ou GIF).

- O front-end envia o arquivo para `POST /api/upload`, que o repassa ao Storage e
  devolve a URL pública — essa URL é salva em `analyses.image_url`.
- Posts antigos que usaram **link** (Google Drive, GitHub, Dropbox) são convertidos
  automaticamente para a URL direta na hora de exibir. No caso do Google Drive, o
  arquivo precisa estar compartilhado como "qualquer pessoa com o link".

## Rodar localmente

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python api/index.py
```

Abra http://127.0.0.1:5000

As credenciais do Supabase já vêm com valores padrão embutidos (a chave
publishable é pública por design). Para sobrescrever, copie `.env.example` e
exporte as variáveis, ou defina-as no ambiente:

```bash
export SUPABASE_URL="https://SEU-PROJETO.supabase.co"
export SUPABASE_KEY="sb_publishable_..."
```

## Deploy no Vercel

1. Suba este repositório para o GitHub.
2. No Vercel, **Import Project** apontando para o repositório.
3. (Opcional) Em *Settings → Environment Variables*, defina `SUPABASE_URL` e
   `SUPABASE_KEY`. Se não definir, os valores padrão do código são usados.
4. Deploy. O `vercel.json` já roteia tudo para `api/index.py`.

## O que NÃO tem (por decisão de escopo)

- Login / autenticação
- Dashboard de admin (gerencie pelo painel do Supabase)
- Edição de análises
