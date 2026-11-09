# Mutirão 🌱

**Uma rede social e econômica para criar, manter e expandir cooperativas.**

Mercados, fábricas, produtoras, grupos de teatro, coletivos de artesanato, serviços: qualquer empreendimento pode
pertencer a quem trabalha nele. O Mutirão dá a essas cooperativas as ferramentas de uma empresa moderna
(vendas, caixa, gestão de trabalho) e as conecta numa rede de troca e ajuda mútua. Assim elas conseguem competir com
grandes empresas.

> Software livre (AGPL-3.0), gratuito, sem anúncios e sem venda de dados. Feito em mutirão.

## O que já funciona (MVP)

| Módulo | O que faz |
|---|---|
| **Cooperativas** | Qualquer pessoa funda uma cooperativa de qualquer tipo, define a cota de entrada e as regras das sobras |
| **Assembleia** | Propostas com prazo, 1 pessoa = 1 voto, quórum de 50% e maioria simples |
| **Caixa aberto** | Livro-caixa público para os membros: toda receita e despesa é visível |
| **Trabalho** | Registro de horas, base para dividir o lucro de forma justa |
| **Sobras** | Simulação da divisão do lucro: fundo de reserva → fundo social → membros (proporcional ao trabalho) |
| **Mercado & trocas** | Produtos, serviços, trocas e pedidos de ajuda, em ordem cronológica e sem algoritmo de engajamento |
| **Meu bairro** | Pessoas, cooperativas e ofertas por proximidade (mesmo bairro → até 3 km → cidade). Pedidos urgentes 🆘 no topo. Localização aproximada (~1 km), nunca exata |
| **Pedidos com Pix direto** | Compra com QR Pix que vai direto para a conta da cooperativa. Confirmação dupla, disputa e reputação. A plataforma nunca guarda dinheiro |
| **Antigolpe** | Dupla aprovação para trocar a chave Pix e para despesas grandes. Livro-caixa encadeado por hash (adulteração detectada). Estorno em vez de apagar |
| **Exportar dados** | Qualquer membro baixa tudo da cooperativa em JSON |
| **Guardião** | A "IA" interna: heurísticas abertas e explicáveis (veja abaixo) |

### O Guardião

Ele observa, explica e sugere. Quem decide é sempre a assembleia. Código em [`src/guardiao/`](src/guardiao):

- **`saude.ts`**: nota de 0 a 100 para a cooperativa, a partir de 6 fatores: participação, divisão do trabalho (índice de Gini), caixa, transparência, liderança distribuída e crescimento. Cada fator vem com o motivo da nota e uma sugestão.
- **`sobras.ts`**: divisão justa do lucro.
- **`conexoes.ts`**: liga pedidos de ajuda a pessoas e ofertas com habilidades compatíveis. Palavras raras pesam mais (IDF). Ofertas da mesma cidade e de outras cooperativas ganham prioridade.
- **`lideranca.ts`**: sugere um rodízio de quem facilita as assembleias.
- **`seguranca.ts`**: alertas contra golpes (caixa adulterado, chave Pix trocada, despesas fora do padrão, concentração de poder financeiro, disputas).

Toda regra é uma função pura e testada (`npm test`). Para mudar um peso, basta abrir um Pull Request e discutir.

## Rodando no seu computador

Requisitos: [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run setup   # cria o banco local (SQLite) e popula com dados de exemplo
npm run dev     # abre em http://localhost:3000
```

Contas de exemplo: `ana@exemplo.org`, `bruno@exemplo.org`, `carla@exemplo.org`, todas com a senha `mutirao123`.

## Stack

- [Next.js](https://nextjs.org) (App Router, Server Actions) + React + Tailwind CSS
- [Drizzle ORM](https://orm.drizzle.team) + SQLite/libSQL: arquivo local em desenvolvimento e [Turso](https://turso.tech) em produção
- Autenticação própria (scrypt + sessão em cookie httpOnly), sem depender de serviços externos

## Publicar gratuitamente

Veja [docs/PUBLICAR.md](docs/PUBLICAR.md).

## Contribuir

Veja [CONTRIBUTING.md](CONTRIBUTING.md) e o [roteiro](docs/ROTEIRO.md). Documentos de desenho:

- [docs/PESQUISA.md](docs/PESQUISA.md): iniciativas parecidas e aprendizados
- [docs/DINHEIRO.md](docs/DINHEIRO.md): por que não somos banco, Pix direto e proteções contra golpe
- [docs/RESILIENCIA.md](docs/RESILIENCIA.md): como durar décadas e atravessar crises (princípios de Ostrom, lições da Fagor e da pandemia)

## Licença

[AGPL-3.0](LICENSE). Você pode usar, estudar, modificar e hospedar o Mutirão. Se oferecer uma versão modificada
como serviço, precisa publicar o código das suas melhorias. Assim o projeto continua sendo um bem comum.
