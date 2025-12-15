import fs from "fs";
import express from "express";
import jsonServer from "json-server";
import multer from "multer";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// ===============================
// SETUP BÁSICO
// ===============================
const server = express();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3000;

server.use(express.json());
server.use(middlewares);

// ===============================
// CONFIG GITHUB
// ===============================
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "chiquinelli-bia/codeconnect-api-2";
const BRANCH = "main";

// ===============================
// FUNÇÕES GITHUB
// ===============================
async function getFileSha(pathInRepo) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${pathInRepo}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
      },
    }
  );

  if (res.ok) {
    const json = await res.json();
    return json.sha;
  }
  return null;
}

async function deleteGithubFile(pathInRepo) {
  const sha = await getFileSha(pathInRepo);
  if (!sha) return;

  await fetch(`https://api.github.com/repos/${REPO}/contents/${pathInRepo}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `delete: ${pathInRepo}`,
      sha,
      branch: BRANCH,
    }),
  });
}

// ===============================
// UPLOAD DE IMAGEM
// ===============================
const upload = multer({ dest: "uploads/" });

server.post("/uploads", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: "nenhum arquivo enviado" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileName = req.file.originalname;
    const repoPath = `uploads/${fileName}`;

    const contentBase64 = fileBuffer.toString("base64");
    const existingSha = await getFileSha(repoPath);

    const body = {
      message: `upload: ${fileName}`,
      content: contentBase64,
      branch: BRANCH,
      ...(existingSha && { sha: existingSha }),
    };

    const response = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${repoPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    fs.unlinkSync(req.file.path);

    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json(error);
    }

    const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${repoPath}?raw=true`;

    res.json({
      url,
      repo_path: repoPath,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "erro no servidor" });
  }
});

// ===============================
// DELETAR IMAGEM (SOMENTE IMAGEM)
// ===============================
server.delete("/uploads", async (req, res) => {
  const { repo_path } = req.body;

  if (!repo_path) {
    return res.status(400).json({ erro: "repo_path é obrigatório" });
  }

  try {
    await deleteGithubFile(repo_path);
    res.json({ mensagem: "Imagem removida com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao remover imagem" });
  }
});

// ===============================
// CRIAR PROJETO
// ===============================
server.post("/projetos", (req, res) => {
  const db = router.db;

  const novoProjeto = {
    id: Date.now(),
    imagem_capa: req.body.imagem_capa, // { url, repo_path }
    titulo: req.body.titulo,
    resumo: req.body.resumo,
    tags: req.body.tags || [],
    linhas_de_codigo: req.body.linhas_de_codigo,
    compartilhamentos: req.body.compartilhamentos,
    comentarios: req.body.comentarios,
    usuario: req.body.usuario || {},
    conteudo_codigo: req.body.conteudo_codigo,
    comentarios_postagem: req.body.comentarios_postagem || [],
  };

  db.get("projetos").push(novoProjeto).write();
  res.status(201).json(novoProjeto);
});

// ===============================
// DELETAR PROJETO + IMAGEM
// ===============================
server.delete("/projetos/:id", async (req, res) => {
  const db = router.db;
  const id = Number(req.params.id);

  const projetos = db.get("projetos").value();
  const index = projetos.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ erro: "Projeto não encontrado" });
  }

  const projeto = projetos[index];

  if (projeto.imagem_capa?.repo_path) {
    try {
      await deleteGithubFile(projeto.imagem_capa.repo_path);
    } catch (e) {
      console.log("Erro ao deletar imagem no GitHub:", e);
    }
  }

  db.get("projetos").splice(index, 1).write();
  res.json({ mensagem: "Projeto e imagem excluídos" });
});

// ===============================
// JSON SERVER (SEMPRE NO FINAL)
// ===============================
server.use(router);

// ===============================
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 API rodando na porta ${port}`);
});
