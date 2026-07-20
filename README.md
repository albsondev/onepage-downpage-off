# Web Scraper Local

Interface local para espelhar sites com `wget`.

## Pré-requisitos

- Node.js 18 ou superior
- `wget` instalado e disponível no terminal

## Executar

```bash
node server.js
```

Abra `http://localhost:3000` no navegador. Os arquivos baixados são armazenados na pasta padrão de Downloads do usuário do sistema (`~/Downloads`).

## Observações

Use a ferramenta apenas em sites para os quais você tenha autorização de download. O servidor aceita somente URLs HTTP e HTTPS.
