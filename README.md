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

O servidor executa um download por vez; novas solicitações durante uma cópia em andamento recebem a resposta HTTP `409`.

Para usar outra porta, defina uma porta inteira entre `1` e `65535`; valores inválidos usam automaticamente a porta `3000`.

```bash
PORT=3001 node server.js
```

## Observações

Use a ferramenta apenas em sites para os quais você tenha autorização de download. O servidor aceita somente URLs HTTP e HTTPS.
