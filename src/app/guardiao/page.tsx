import { WEIGHTS } from "@/guardiao/saude";
import { PageTitle } from "@/components/ui";

const REPO = "https://github.com/Lucaszas/mutirao/tree/main/src/guardiao";

export default function Guardiao() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageTitle
        title="🌱 O Guardião"
        subtitle="A inteligência interna do Mutirão. Não é uma caixa-preta e não manda em ninguém: observa, explica e sugere. Quem decide é sempre a assembleia."
      />

      <section className="card space-y-2">
        <h2 className="h-display text-xl">Princípios do algoritmo</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Aberto:</b> todo o código está em <code>src/guardiao/</code>, legível por qualquer pessoa.</li>
          <li><b>Explicável:</b> toda nota e toda sugestão vem com o motivo, em português simples.</li>
          <li><b>A serviço das pessoas:</b> otimiza saúde coletiva, justiça e cooperação — nunca tempo de tela, cliques ou anúncios.</li>
          <li><b>Consultivo:</b> sugere, não decide. Nenhuma regra é aplicada sem votação.</li>
          <li><b>Mutável pela comunidade:</b> pesos e regras mudam por proposta pública no repositório.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="h-display text-xl">1. Saúde da cooperativa (0–100)</h2>
        <p className="text-sm text-muted">Média ponderada de seis fatores, olhando os últimos 90 dias:</p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-line">
            {[
              ["participacao", "Participação democrática", "% médio de membros que votam nas propostas"],
              ["distribuicao", "Divisão do trabalho", "índice de Gini das horas + % de membros ativos (evita esgotamento de poucos)"],
              ["caixa", "Sustentabilidade financeira", "quanto as receitas cobrem as despesas"],
              ["transparencia", "Transparência", "há quanto tempo o livro-caixa foi atualizado"],
              ["lideranca", "Liderança distribuída", "quantas pessoas diferentes apresentam propostas"],
              ["crescimento", "Crescimento", "número de membros e novas entradas"],
            ].map(([k, label, how]) => (
              <tr key={k}>
                <td className="py-2 pr-3 font-medium">{label}</td>
                <td className="py-2 pr-3 text-muted">{how}</td>
                <td className="py-2 text-right font-mono">{Math.round(WEIGHTS[k as keyof typeof WEIGHTS] * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card space-y-2">
        <h2 className="h-display text-xl">2. Divisão das sobras</h2>
        <p className="text-sm">
          Resultado positivo → primeiro o <b>fundo de reserva</b> (protege a cooperativa), depois o <b>fundo social</b>{" "}
          (formação, expansão e apoio a novas cooperativas da rede) e o restante dividido entre os membros{" "}
          <b>na proporção do trabalho registrado</b>, não do capital. Os percentuais são definidos por cada cooperativa.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="h-display text-xl">3. Conexões de ajuda mútua</h2>
        <p className="text-sm">
          Para cada pedido de ajuda ou troca, o Guardião procura ofertas e pessoas com habilidades compatíveis. A pontuação
          considera palavras em comum (similaridade de Jaccard), <b>mesma cidade</b> (+40%, fortalece a economia local) e se
          quem oferece é <b>uma cooperativa</b> (+20%, intercooperação).
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="h-display text-xl">4. Rodízio de liderança</h2>
        <p className="text-sm">
          Sugere quem pode facilitar a próxima assembleia: pessoas engajadas (votam, trabalham) que ainda não conduziram pautas
          recentemente. Liderança é uma função que circula, não um cargo.
        </p>
      </section>

      <section className="card space-y-2">
        <h2 className="h-display text-xl">5. Segurança financeira</h2>
        <p className="text-sm">
          Vigia os roteiros de golpe mais comuns em coletivos: <b>livro-caixa alterado por fora</b> (detectado pela corrente de
          hashes), <b>chave Pix trocada recentemente</b>, <b>despesas mais de 4× acima do típico</b>, <b>uma pessoa concentrando
          mais de 80% das despesas</b>, pedidos em disputa e pagamentos esperando confirmação. Trocar a chave Pix e lançar
          despesas grandes exige a assinatura de outro membro.
        </p>
      </section>

      <p className="text-sm text-muted">
        Quer melhorar o Guardião? Leia o código em <a className="text-brand underline" href={REPO}>src/guardiao</a> e abra uma
        proposta. Próximos passos sonhados: previsão de caixa, compras coletivas entre cooperativas, alerta de conflitos e
        um assistente de IA (LLM) que explica tudo isso em conversa — sempre com as mesmas regras de transparência.
      </p>
    </div>
  );
}
