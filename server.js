// server.js
const express = require("express");
const jsonServer = require("json-server");
const multer = require("multer");
const fs = require("fs");
require("dotenv").config();
const fetch = require("node-fetch"); // se não tiver, instalar: npm install node-fetch

const server = express();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

const port = process.env.PORT || 3000;

server.use(express.json());
server.use(middlewares);

// multer salva localmente na pasta uploads/
const upload = multer({ dest: "uploads/" });

// Rota para enviar imagem direto para GitHub
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
    };
    if (existingSha) body.sha = existingSha;

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

// Rota para criar projetos com imagem + campos JSON
const uploadProjeto = upload.single("imagem");

server.post("/projetos", uploadProjeto, (req, res) => {
  try {
    const db = router.db; // acesso ao db.json

    const imagem = req.file
      ? `/uploads/${req.file.filename}`
      : null;

    const {
      titulo,
      resumo,
      linhas_de_codigo,
      compartilhamentos,
      comentarios,
      conteudo_codigo,
    } = req.body;

    const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
    const usuario = req.body.usuario ? JSON.parse(req.body.usuario) : {};
    const comentarios_postagem = req.body.comentarios_postagem
      ? JSON.parse(req.body.comentarios_postagem)
      : [];

    const novoProjeto = {
      id: Date.now(),
      titulo,
      resumo,
      tags,
      linhas_de_codigo,
      compartilhamentos,
      comentarios,
      usuario,
      conteudo_codigo,
      comentarios_postagem,
      imagem,
    };

    db.get("projetos").push(novoProjeto).write();

    res.status(201).json(novoProjeto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar projeto" });
  }
});

server.use(router);

server.listen(port, "0.0.0.0", () => {
  console.log(`🎉 JSON Server rodando na porta ${port}`);
});
