"use client";

import { useState } from "react";
import { encodeGeohash } from "@/lib/geo";

type Props = { bairro?: string; city?: string; uf?: string; geohash?: string };

/**
 * Bairro, cidade e localização aproximada.
 * - O CEP só preenche bairro/cidade (consulta ao ViaCEP feita pelo seu navegador; o CEP não é salvo).
 * - "Usar minha localização" arredonda a posição para uma célula de ~1 km ANTES de enviar.
 */
export function LocationFields({ bairro = "", city = "", uf = "", geohash = "" }: Props) {
  const [v, setV] = useState({ bairro, city, uf, geohash });
  const [msg, setMsg] = useState("");

  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setMsg("Buscando CEP…");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const d = await r.json();
      if (d.erro) return setMsg("CEP não encontrado.");
      setV((s) => ({ ...s, bairro: d.bairro || s.bairro, city: d.localidade || s.city, uf: d.uf || s.uf }));
      setMsg("Endereço aproximado preenchido. O CEP não é guardado.");
    } catch {
      setMsg("Não deu para consultar o CEP agora. Preencha à mão.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setMsg("Seu navegador não informa localização.");
    setMsg("Pegando localização aproximada…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setV((s) => ({ ...s, geohash: encodeGeohash(pos.coords.latitude, pos.coords.longitude) }));
        setMsg("Localização aproximada salva (célula de ~1 km — ninguém vê seu endereço).");
      },
      () => setMsg("Permissão negada. Tudo bem: usamos só bairro e cidade."),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold">Onde fica (para conectar com a vizinhança)</legend>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div>
          <label className="label" htmlFor="cep">CEP</label>
          <input className="input" id="cep" inputMode="numeric" placeholder="00000-000" onBlur={(e) => lookupCep(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="bairro">Bairro / comunidade</label>
          <input className="input" id="bairro" name="bairro" value={v.bairro} onChange={(e) => setV({ ...v, bairro: e.target.value })} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_5rem]">
        <div>
          <label className="label" htmlFor="city">Cidade</label>
          <input className="input" id="city" name="city" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="uf">UF</label>
          <input className="input" id="uf" name="uf" maxLength={2} value={v.uf} onChange={(e) => setV({ ...v, uf: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <input type="hidden" name="geohash" value={v.geohash} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost" onClick={useMyLocation}>
          📍 {v.geohash ? "Atualizar localização aproximada" : "Usar minha localização aproximada"}
        </button>
        {v.geohash && <span className="chip">localização aproximada ✓</span>}
      </div>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </fieldset>
  );
}
