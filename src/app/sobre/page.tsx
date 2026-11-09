import { PageTitle } from "@/components/ui";

export default function Sobre() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Manifesto" subtitle="Por que o Mutirão existe." />
      <div className="card space-y-4 leading-relaxed">
        <p>
          <b>Mutirão</b> é a tradição brasileira de juntar a vizinhança para fazer, juntos, o que ninguém faria sozinho:
          levantar uma casa, colher uma roça, abrir uma estrada. Esta plataforma leva essa ideia para a economia.
        </p>
        <p>
          Grandes plataformas concentram o valor criado por milhões de pessoas nas mãos de poucos acionistas. Aqui, a
          proposta é o contrário: <b>empresas que pertencem a quem trabalha nelas e a quem as usa</b>, conectadas numa rede
          que troca, compra e se ajuda.
        </p>
        <p>
          Cooperativas precisam lucrar — chamamos de <i>sobras</i> — para crescer, pagar bem e competir com gigantes. A
          diferença está em <b>como o lucro é dividido</b> e <b>quem decide</b>: cada pessoa, um voto; contas abertas;
          sobras repartidas pelo trabalho; uma parte sempre reinvestida na comunidade e em novas cooperativas.
        </p>
        <h2 className="h-display pt-2 text-xl">Os 7 princípios que seguimos</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Adesão livre e voluntária</li>
          <li>Gestão democrática (1 pessoa = 1 voto)</li>
          <li>Participação econômica dos membros</li>
          <li>Autonomia e independência</li>
          <li>Educação, formação e informação</li>
          <li>Intercooperação — cooperativas ajudando cooperativas</li>
          <li>Interesse pela comunidade</li>
        </ol>
        <h2 className="h-display pt-2 text-xl">A plataforma também é um bem comum</h2>
        <p>
          O código é livre (licença AGPL-3.0): qualquer pessoa pode usar, estudar, melhorar e hospedar a sua própria
          instância — e as melhorias precisam continuar livres. Não há anúncios, venda de dados nem algoritmo que vicia.
        </p>
      </div>
    </div>
  );
}
