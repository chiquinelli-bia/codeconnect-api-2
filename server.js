const uploadProjeto = upload.single("imagem");

server.post("/projetos", uploadProjeto, async (req, res) => {
  try {
    const db = router.db; // acesso ao db.json

    // imagem enviada ou URL default
    const imagem = req.file
      ? `uploads/${req.file.filename}` // você pode integrar com GitHub se quiser
      : null;

    // campos do body
    const {
      titulo,
      resumo,
      linhas_de_codigo,
      compartilhamentos,
      comentarios,
      conteudo_codigo,
    } = req.body;

    // campos que vieram como JSON string
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

