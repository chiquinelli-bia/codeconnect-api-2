# 📦 CodeConnect API

API REST criada juntamente com IA para dar suporte à aplicação **CodeConnect**, permitindo o cadastro de projetos com upload de imagens, persistência de dados e integração com o GitHub como armazenamento de arquivos.

O projeto foi desenvolvido com fins educacionais, simulando um backend real em ambiente de produção.

---

## 🚀 Tecnologias utilizadas

- Node.js
- Express
- JSON Server
- Multer
- GitHub REST API
- Render (deploy)

---

## 🧠 Visão geral da arquitetura

- Os **dados dos projetos** são armazenados em um `db.json` usando `json-server`.
- As **imagens** são enviadas para o GitHub, dentro da pasta `uploads/`.
- A API retorna a URL pública da imagem, que é salva junto ao projeto.
- O ambiente do Render é **efêmero**, portanto os dados do `db.json` podem ser resetados.
- As imagens permanecem disponíveis por estarem versionadas no GitHub.

---

## 📤 Upload de imagem

### `POST /uploads`

Envia uma imagem para o GitHub.

**Body (form-data):**

- `image` → arquivo da imagem

**Resposta:**

```json
{
  "url": "https://raw.githubusercontent.com/.../uploads/imagem.png?raw=true",
  "repo_path": "uploads/imagem.png"
}
```

## 📄 Listar projetos

### GET /projetos

Retorna todos os projetos cadastrados.

## 🗑️ Excluir projeto (e imagem)

### DELETE /projetos/:id

- Remove o projeto do banco de dados
- Remove a imagem correspondente do GitHub (se existir)

```Resposta
{
  "mensagem": "Projeto e imagem excluídos"
}
```

### 🧪 Uso com Postman

**Upload**

- Method: `POST`
- URL: `/uploads`
- Body: `form-data`
- Key: `image` (File)

**Criar projeto**

- Method: `POST`
- URL: `/projetos`
- Body: `raw → JSON`

**Excluir projeto**

- Method: `DELETE`
- URL: `/projetos/{id}`

## ⚠️ Observações importantes

- O Render não mantém arquivos locais.
- O db.json pode ser resetado automaticamente.
- As imagens não são perdidas, pois ficam no GitHub.
- O projeto foca em integração frontend + backend, não em persistência definitiva.
