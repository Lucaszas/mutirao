# Dinheiro: como funciona e por que não somos um banco

## A decisão central: a plataforma nunca toca no dinheiro

Todo pagamento vai **direto** da conta de quem compra para a conta da cooperativa, por **Pix**. O Mutirão gera o QR
Code (BR Code estático, padrão aberto do Banco Central) e organiza as confirmações. Ele nunca guarda, repassa nem
retém valores.

**Por quê?**

| Se a plataforma guardasse dinheiro… | Guardando nada… |
|---|---|
| Viraria instituição de pagamento (autorização do Banco Central, capital mínimo, compliance) | Não precisa de licença: é só software |
| Um invasor ou um administrador desonesto poderia desviar o saldo de todas as cooperativas | Não existe um "cofre central" para roubar |
| Se o projeto acabar ou o servidor cair, o dinheiro fica preso | O dinheiro está sempre no banco de cada cooperativa |
| Precisaria cobrar taxas para pagar a estrutura | Pix entre pessoas é gratuito |

Fazer um banco open source é tecnicamente possível, mas a barreira regulatória e o risco não compensam enquanto o
Pix resolve a transferência. O que falta não é um banco, e sim **confiança e controle coletivo** sobre o dinheiro.
Isso o software resolve.

## Proteções contra golpe (já implementadas)

| Roteiro de golpe | Proteção |
|---|---|
| Um membro troca a chave Pix para a conta dele | A troca só vale com **assinatura de outro membro** (2 assinaturas em cooperativas com mais de 5 pessoas). Durante 7 dias, alerta para membros e compradores |
| Trocar a chave depois do pedido feito | A chave fica **congelada no pedido**: mudar a da cooperativa não altera pedidos abertos |
| Lançar despesa falsa grande | Despesas acima do limite (padrão R$ 500) precisam de **dupla aprovação** |
| Apagar ou editar um lançamento | Não existe editar nem apagar, só **estorno**, que fica registrado |
| Alterar o banco de dados por fora | O livro-caixa é **encadeado por hash** (cada registro depende do anterior). Qualquer alteração quebra a corrente e todo membro vê o alerta |
| Despesas fora do padrão, ou uma pessoa só controlando o caixa | O **Guardião** alerta quando um valor passa de 4× a despesa típica ou quando uma pessoa concentra mais de 80% das despesas |
| Vender e não entregar | O pedido tem **dupla confirmação** (pagamento confirmado pela cooperativa, entrega confirmada por quem comprou), **disputa** e **reputação pública** |
| Golpe do recebedor falso | A tela de pagamento destaca o **nome do titular** e orienta a não pagar se o banco mostrar outro nome. Também explica o MED (Mecanismo Especial de Devolução do Pix) |

## O que ainda é limitação (seja honesto com os usuários)

- **A confirmação de pagamento é manual.** Um membro confere o extrato. Para automatizar é preciso a API Pix de um
  banco ou PSP, com cobrança dinâmica e webhook. Muitos bancos e cooperativas de crédito oferecem isso para CNPJ
  (Sicredi, Cresol, Banco do Brasil, Inter e outros). Está no roteiro como integração opcional por cooperativa.
- **Grupos informais (sem CNPJ)** acabam usando a conta de uma pessoa. Recomendamos abrir conta PJ em uma
  **cooperativa de crédito** assim que possível.
- **O hash encadeado detecta, mas não impede**, que alguém com acesso total ao servidor reescreva tudo do zero.
  Contra isso: cada membro pode **exportar os dados** (e guardar o "hash da ponta"), e o roteiro prevê publicar
  periodicamente o hash da ponta em um lugar externo (um repositório público, por exemplo).

## Próximos passos possíveis

1. **API Pix por cooperativa:** cobrança dinâmica e confirmação automática via webhook.
2. **Parceria com bancos comunitários e o e-dinheiro:** a Rede Brasileira de Bancos Comunitários (mais de 100
   bancos, origem no Banco Palmas, em Fortaleza) já opera moedas sociais digitais com lastro em reais. Integrar em vez
   de reinventar.
3. **Crédito mútuo entre cooperativas** (inspirado no Sardex): cooperativas "compram fiado" umas das outras dentro da
   rede, com limites votados. Isso movimenta a economia sem dinheiro, o que é muito útil em crises de liquidez. Não
   exige banco, porque é um registro contábil compartilhado.
4. **Fundo social da rede:** parte das sobras de cada cooperativa forma um fundo coletivo para apoiar novas
   cooperativas e emergências, com decisão por voto.

## Fontes

- [Manual do BR Code — Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/ativosdosite/Manual%20do%20BR%20Code.pdf), [payload do Pix Copia e Cola (TabNews)](https://www.tabnews.com.br/usrbinenv/entendendo-o-payload-do-pix-copia-e-cola-e-gerando-um-qr-code-estatico)
- MED 2.0: [Migalhas](https://www.migalhas.com.br/depeso/461637/a-rede-de-seguranca-do-pix-na-era-do-med-2-0-responsabilidade), [Finsiders](https://finsidersbrasil.com.br/pagamentos/pix/com-med-2-0-bc-quer-diminuir-falsos-positivos-e-rastrear-laranjas/), [Garrastazu](https://garrastazu.adv.br/mecanismo-especial-de-devolucao-do-pix-quando-funciona-e-como-solicitar)
- E-dinheiro e bancos comunitários: [FGV — Palmas para o e-dinheiro](https://eaesp.fgv.br/sites/default/files/legacy/pesquisa-eaesp-files/arquivos/palmas_para_o_e-dinheiro.pdf), [Diário do Nordeste](https://diariodonordeste.verdesmares.com.br/negocios/moedas-sociais-giram-milhoes-no-ceara-e-aderem-a-versao-digital-1.1937398), [Revista Pesquisa FAPESP](https://revistapesquisa.fapesp.br/wp-content/uploads/2025/01/076-080_moedas-sociais_347.pdf)
- Mumbuca (Maricá): [FGV — Mumbuca é dinheiro](https://eaesp.fgv.br/producao-intelectual/mumbuca-e-dinheiro), [FGV — moedas digitais na Covid-19](https://pesquisa-eaesp.fgv.br/sites/gvpesquisa.fgv.br/files/arquivos/moedas_complementares_digitais_e_politicas_publicas_durante_a_crise_dos_covid-19.pdf)
- Crédito mútuo: [Open Co-op](https://open.coop/mutual-credit/)
