import fs from "fs";
import path from "path";
import express from "express";
import jsonServer from "json-server";
import multer from "multer";
import dotenv from "dotenv";
import fetch from "node-fetch";

// Inicializa variáveis do .env
dotenv.config();

// Setup básico
const server = express();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();
const port = process.env.PORT || 3000;

const __dirname = path.dirname(new URL(import.meta.url).pathname);

// ==========================================
// 🔥 ROTA PARA DELETAR PROJETO
// ==========================================
server.delete("/projetos/:id", (req, res) => {
  const db = router.db;
  const projetos = db.get("projetos").value();
  const id = Number(req.params.id);

  const index = projetos.findIndex((p) => p.id === id);
  if (index === -1) {
    return res.status(404).json({ erro: "Projeto não encontrado" });
  }

  const projeto = projetos[index];

  // Excluir imagem associada (se existir)
  if (projeto.imagem_url) {
    const caminhoImagem = path.join(__dirname, "uploads", path.basename(projeto.imagem_url));

    fs.unlink(caminhoImagem, (erro) => {
      if (erro) {
        console.log("⚠️ Erro ao excluir imagem (não é crítico):", erro);
      }
    });
  }

  db.get("projetos").splice(index, 1).write();

  res.json({ mensagem: "Projeto excluído com sucesso" });
});

// Middlewares
server.use(express.json());
server.use(middlewares);

// ==========================================
// 🔥 UPLOAD DE IMAGEM PARA O GITHUB
// ==========================================
const upload = multer({ dest: "uploads/" });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "chiquinelli-bia/codeconnect-api-2";
const BRANCH = "main";

async function getFileSha(pathInRepo) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${pathInRepo}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}` },
  });

  if (res.status === 200) {
    const json = await res.json();
    return json.sha;
  }
  return null;
}

server.post("/uploads", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "nenhum arquivo enviado" });

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    const repoPath = `uploads/${fileName}`;
    const fileBuffer = fs.readFileSync(filePath);
    const contentBase64 = fileBuffer.toString("base64");

    const existingSha = await getFileSha(repoPath);

    const body = {
      message: `upload: ${fileName}`,
      content: contentBase64,
      branch: BRANCH,
      ...(existingSha && { sha: existingSha }),
    };

    const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${repoPath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    fs.unlinkSync(filePath);

    if (!response.ok) {
      return res.status(response.status).json({ error: result });
    }

    const downloadUrl =
      result.content?.download_url ||
      `https://raw.githubusercontent.com/${REPO}/${BRANCH}/uploads/${encodeURIComponent(fileName)}`;

    return res.json({ url: downloadUrl + "?raw=true" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "erro no servidor" });
  }
});

// ==========================================
// 🔥 CRIAR PROJETO
// ==========================================
server.post("/projetos", (req, res) => {
  try {
    const db = router.db;

    const novoProjeto = {
      id: Date.now(),
      imagem_capa: req.body.imagem_capa,
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar projeto" });
  }
});

// JSON Server router
server.use(router);

// Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`🎉 JSON Server rodando na porta ${port}`);
});
