const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

const port = process.env.PORT || 3000;

server.use(middlewares);
server.use(router);

// Escutando no 0.0.0.0 para o Render conseguir acessar
server.listen(port, '0.0.0.0', () => {
  console.log(`JSON Server is running on http://0.0.0.0:${port}`);
});
