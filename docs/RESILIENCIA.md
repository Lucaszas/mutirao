# Resiliência: durar décadas e atravessar crises

O objetivo é que a rede **sobreviva a quem a criou**: a crises econômicas, pandemias, desastres, conflitos, a
governos hostis e ao próprio projeto deixar de existir.

## Lições de quem veio antes

- **Mondragon / Fagor (2013):** a intercooperação recolocou boa parte dos trabalhadores da Fagor em outras
  cooperativas. Mas a governança não conseguiu fiscalizar a gestão nem tomar decisões difíceis a tempo, e a
  proteção não chegou aos trabalhadores de subsidiárias e terceirizados. **Lição:** fundos de reserva e
  intercooperação salvam empregos, mas a assembleia precisa de informação clara e cedo. Esse é o papel do Guardião.
- **Redes de ajuda mútua na Covid-19:** grupos como Bed-Stuy Strong (28 mil pessoas atendidas no Brooklyn) e a rede de
  Astoria improvisaram com Slack, Airtable e mapas. Funcionou por proximidade (o voluntário mais perto do pedido),
  mas dependia de poucos voluntários técnicos e de ferramentas proprietárias. **Lição:** ter a ferramenta pronta
  *antes* da crise, baseada em bairro e livre.
- **Moedas sociais na pandemia:** Maricá usou a Mumbuca, uma moeda digital lastreada em reais, para pagar auxílios
  durante a crise. **Lição:** a infraestrutura local de dinheiro já existente pode ser ativada rápido.
- **Elinor Ostrom (bens comuns):** comunidades que gerem recursos comuns por séculos compartilham 8 princípios. O
  desenho do Mutirão segue esses princípios (tabela abaixo).

## Os 8 princípios de Ostrom aplicados

| Princípio | Como o Mutirão aplica |
|---|---|
| 1. Limites claros | Quem é membro de cada cooperativa é explícito. Só membros votam e mexem no caixa |
| 2. Regras adaptadas ao local | Cada cooperativa define cota, fundos e limites |
| 3. Quem é afetado decide | 1 pessoa = 1 voto, propostas abertas a qualquer membro |
| 4. Monitoramento | Caixa aberto, hash encadeado e alertas do Guardião |
| 5. Sanções graduais | Alertas → disputa → reputação → assembleia (a fazer: suspensão votada) |
| 6. Resolução de conflitos barata | Disputas dentro da plataforma, mediadas pelo coletivo |
| 7. Direito de se auto-organizar | Software livre: qualquer grupo pode hospedar a sua própria instância |
| 8. Organizações aninhadas | Pessoa → cooperativa → bairro → rede (a fazer: federação de instâncias) |

## Arquitetura para crises

### Já implementado
- **Organização por bairro e proximidade:** pessoas, cooperativas e ofertas ordenadas por *mesmo bairro → até 3 km →
  mesma cidade*. Em crise, quem ajuda primeiro é o vizinho.
- **Pedidos urgentes (🆘):** aparecem no topo da página do bairro e ganham prioridade nas conexões do Guardião.
- **Privacidade de localização:** a posição é arredondada para uma célula de ~1 km no próprio navegador. O endereço
  exato nunca chega ao servidor, o que importa em contextos de perseguição ou conflito.
- **Os dados são da cooperativa:** qualquer membro exporta tudo em JSON a qualquer momento. Se a plataforma cair,
  a cooperativa continua tendo seus registros.
- **Dinheiro fora da plataforma:** nenhum saldo fica preso se o servidor sair do ar.
- **Leve e simples:** SQLite, um processo Node. Roda num computador velho, num Raspberry Pi ou numa VPS de R$ 25 por mês.
  Não depende de nenhum serviço pago.

### Roteiro de resiliência
1. **Funcionar sem internet (PWA offline-first):** guardar o bairro e as cooperativas no celular, registrar trabalho e
   lançamentos offline e sincronizar depois.
2. **Federação (ActivityPub):** várias instâncias independentes que conversam entre si, como o Mastodon. Se uma
   cair ou for censurada, as outras seguem.
3. **Âncora pública do caixa:** publicar periodicamente o hash da ponta do livro-caixa em lugares externos. Isso
   impede até o administrador do servidor de reescrever a história.
4. **Acesso por SMS ou WhatsApp** para quem tem pouco dado móvel. Consultas e pedidos de ajuda por mensagem.
5. **Modo emergência por bairro:** ativado por votação local, prioriza pedidos urgentes, mostra pontos de coleta e
   permite crédito mútuo emergencial entre cooperativas.
6. **Backups automáticos** distribuídos entre cooperativas parceiras.

## Governança do projeto (para durar mais que os fundadores)

- **Licença AGPL-3.0:** ninguém pode fechar o código.
- **Entidade guardiã:** quando o projeto ganhar tração, criar uma associação ou uma *cooperativa de plataforma
  multissetorial*, com usuários, cooperativas e desenvolvedores como membros. O domínio, a marca e os servidores ficam
  com ela, não com uma pessoa.
- **Regras do Guardião votadas:** mudar pesos e limites do algoritmo exige proposta pública no repositório e, no
  futuro, votação na própria plataforma.
- **Fator ônibus:** pelo menos três pessoas com acesso a domínio, servidor e repositório, com o processo documentado.
- **Financiamento sem dono:** doações recorrentes e editais (economia solidária, BNDES, fundações), além de uma
  contribuição voluntária das sobras das cooperativas, nunca de anúncios ou da venda de dados.

## Fontes

- Fagor/Mondragon: [CLEO Rutgers](https://cleo.rutgers.edu/articles/inter-cooperation-mechanisms-in-mondragon-managing-the-crisis-of-fagor-electrodomesticos), [Basterretxea et al. 2022](https://econpapers.repec.org/RePEc:sae:ecoind:v:43:y:2022:i:1:p:362-387), [YES! Magazine](https://www.yesmagazine.org/?p=12018), [Global Dialogue](https://globaldialogue.isa-sociology.org/the-mondragon-cooperatives-successes-and-challenges)
- Ajuda mútua na pandemia: [Computerworld](https://www.computerworld.com/article/3567471/how-slack-airtable-and-open-source-software-connected-new-yorkers-during-the-pandemic.html), [Beeck Center (Georgetown)](https://beeckcenter.georgetown.edu/four-key-takeaways-from-mutual-aid-organizing-during-the-covid-19-pandemic/), [New Relic FutureHack](https://newrelic.com/blog/nerd-life/futurehack-for-good-winner-2021)
- Ostrom: [P2P Foundation](https://wiki.p2pfoundation.net/Elinor_Ostrom’s_Eight_Commons_Governance_Design_Principles), [Open Data como bem comum](https://ar5iv.labs.arxiv.org/html/2208.01694)
- Privacidade de localização: [Check Point Research](https://research.checkpoint.com/2024/the-illusion-of-privacy-geolocation-risks-in-modern-dating-apps/), [geohash no BitChat](https://instagit.com/permissionlesstech/bitchat/how-does-geohash-precision-hierarchy-work-in-bitchat.md)
