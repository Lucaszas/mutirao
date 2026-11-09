# Como contribuir

O Mutirão é feito em mutirão. Dá para ajudar com código, design, textos, testes com cooperativas reais ou
contando como funciona a sua cooperativa.

## Primeiros passos

1. Faça um fork e clone o repositório.
2. `npm install && npm run setup && npm run dev`
3. Escolha uma tarefa no [roteiro](docs/ROTEIRO.md) ou nas issues marcadas como `boa-primeira-tarefa`.
4. Abra um Pull Request explicando **o que** mudou e **por quê**.

## Antes do Pull Request

```bash
npm test        # testes do Guardião
npm run lint
npm run build
```

## Mudanças no Guardião

O Guardião influencia como as cooperativas se enxergam, então mudanças nele precisam de mais cuidado:

- Toda regra nova precisa ser **explicável em uma frase** para quem não programa.
- Inclua um teste em `src/guardiao/guardiao.test.ts`.
- Atualize a página `/guardiao` se mudar pesos ou fatores.
- Nunca otimize tempo de tela, cliques ou engajamento.

## Convivência

Respeito, paciência com quem está começando e decisões tomadas no coletivo. Discriminação ou assédio levam à
exclusão do projeto.

## Mudanças no banco

Altere `src/db/schema.ts` e rode `npm run db:push`.
