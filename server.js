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
  if (ind
