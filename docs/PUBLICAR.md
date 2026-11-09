# Como colocar o Mutirão no ar (de graça)

Caminho recomendado para começar: **GitHub (código) + Turso (banco) + Vercel (site)**. Os três têm planos gratuitos.

## 1. Código no GitHub

1. Crie uma conta em <https://github.com> e um repositório público chamado `mutirao` (sem README).
2. No terminal, dentro da pasta do projeto:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/mutirao.git
   git push -u origin main
   ```
3. Em `src/app/guardiao/page.tsx`, troque `SEU-USUARIO` pelo seu usuário.

## 2. Banco de dados no Turso

1. Crie uma conta em <https://turso.tech> (o plano gratuito comporta muitos bancos e bastante uso).
2. Crie um banco (ex.: `mutirao`) e copie a **URL** (`libsql://...`) e um **token**.
3. Crie as tabelas a partir do seu computador:
   ```bash
   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npm run db:push
   ```
   Se quiser os dados de exemplo, rode também `npm run db:seed` com as mesmas variáveis.

## 3. Site na Vercel

1. Crie uma conta em <https://vercel.com> usando o GitHub.
2. Em **Add New → Project**, importe o repositório `mutirao`.
3. Em **Environment Variables**, adicione `DATABASE_URL` e `DATABASE_AUTH_TOKEN`.
4. Clique em **Deploy**. Cada `git push` publica uma versão nova automaticamente.

> ⚠️ O plano gratuito (Hobby) da Vercel é para uso **não comercial**. Para um projeto comunitário sem fins lucrativos
> ele serve para começar. Quando a plataforma movimentar vendas de verdade, migre para uma das opções abaixo ou peça
> o programa da Vercel para projetos open source.

## Alternativas (soberania e longo prazo)

- **Servidor próprio ou de uma cooperativa de tecnologia** (ex.: a [Eita](https://eita.coop.br), que nasceu do Cirandas):
  `npm run build && npm start` em qualquer VPS com Node.js. O SQLite local (`file:local.db`) funciona bem até milhares de usuários.
- **Coolify / Docker** em uma VPS barata.
- **Render / Railway / Fly.io**: têm planos gratuitos ou baratos para apps Node.

## Domínio

Um `.org` ou `.coop` custa em torno de R$ 60–150 por ano. Também dá para usar o endereço gratuito `mutirao-xxx.vercel.app`.

## Antes de abrir ao público

- [ ] Política de privacidade e termos de uso (LGPD)
- [ ] Recuperação de senha por e-mail
- [ ] Moderação e denúncia de conteúdo
- [ ] Backups do banco (o Turso tem recuperação para um ponto no tempo)
