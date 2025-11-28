const jsonServer = require("json-server");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fetch = require("node-fetch");
require("dotenv").config();

const server = express();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

const port = process.env.PORT || 3000;

server.use(express.json());
server.use(middlewares);

// multer salva localmente na pasta uploads/
const upload = multer({ dest: "uploads/" });

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = "chiquinelli-bia/codeconnect-api-2";
const BRANCH = "main";

async function getFileSha(pathInRepo) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${pathInRepo}`,
    { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } }
  );

  if (res.status === 200) {
    const json = await res.json();
    return json.sha;
  }
  return null;
}

// ----------------------
// ROTA DE UPLOAD (DEVE VIR ANTES DO ROUTER!)
// ----------------------
server.post("/uploads", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "nenhum arquivo enviado" });

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

    const result = await response.json();

    fs.unlinkSync(filePath);

    if (!response.ok) {
      return res.status(response.status).json({ error: result });
    }

    const downloadUrl =
      result.content?.download_url ||
      `https://raw.githubusercontent.com/${REPO}/${BRANCH}/uploads/${encodeURIComponent(
        fileName
      )}`;

    return res.json({ url: downloadUrl + "?raw=true" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "erro no servidor" });
  }
});

// ----------------------
// JSON SERVER ROUTER (DEVE VIR ANTES DO LISTEN)
// ----------------------
server.use(router);

// ----------------------
// LISTEN
// ----------------------
server.listen(port, "0.0.0.0", () => {
  console.log(`🎉 JSON Server rodando na porta ${port}`);
});
