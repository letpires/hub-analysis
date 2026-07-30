import os
import requests
from flask import Flask, render_template, request, jsonify

# templates/ e static/ ficam na raiz do projeto (um nível acima de api/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
)

# Configuração do Supabase. Em produção, defina estas variáveis no Vercel.
# A chave publishable/anon é pública por design — o RLS protege a tabela.
SUPABASE_URL = os.environ.get(
    "SUPABASE_URL", "https://zduyyzadzrbykrgjxqdc.supabase.co"
).rstrip("/")
SUPABASE_KEY = os.environ.get(
    "SUPABASE_KEY", "sb_publishable_slkPO5p2TbfJ0HQtexIe7Q_U3x79P4K"
)

REST_URL = f"{SUPABASE_URL}/rest/v1/analyses"

# Tags permitidas (mantém o dropdown e a validação em sincronia).
TAGS = ["exploratória", "limpeza", "visualização", "estatística", "clínica"]


def _headers(extra=None):
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


@app.route("/")
def landing():
    return render_template("index.html")


@app.route("/hub")
def hub():
    return render_template("hub.html", tags=TAGS)


@app.route("/api/analyses", methods=["GET"])
def list_analyses():
    try:
        resp = requests.get(
            REST_URL,
            headers=_headers(),
            params={"select": "*", "order": "created_at.desc"},
            timeout=15,
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.RequestException as exc:
        return jsonify({"error": f"Falha ao carregar análises: {exc}"}), 502


@app.route("/api/analyses", methods=["POST"])
def create_analysis():
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    author = (data.get("author") or "").strip()
    tag = (data.get("tag") or "").strip()

    if not title:
        return jsonify({"error": "O título é obrigatório."}), 400
    if not author:
        return jsonify({"error": "O nome do autor é obrigatório."}), 400
    if tag not in TAGS:
        tag = TAGS[0]

    payload = {
        "title": title,
        "description": (data.get("description") or "").strip() or None,
        "author": author,
        "tag": tag,
        "github_link": (data.get("github_link") or "").strip() or None,
        "image_url": (data.get("image_url") or "").strip() or None,
    }

    try:
        resp = requests.post(
            REST_URL,
            headers=_headers({"Prefer": "return=representation"}),
            json=payload,
            timeout=15,
        )
        resp.raise_for_status()
        created = resp.json()
        return jsonify(created[0] if isinstance(created, list) else created), 201
    except requests.RequestException as exc:
        detail = ""
        if exc.response is not None:
            detail = exc.response.text
        return jsonify({"error": f"Falha ao salvar: {exc}", "detail": detail}), 502


# Necessário para o runtime do Vercel (WSGI espera uma variável `app`).
if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(debug=True, host="0.0.0.0", port=port)
