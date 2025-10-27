// N8N Code Node - Análise de Evolução Semanal com Resumo Único
const inputItems = $input.all();

// Verificar se os dados estão em um array 'data' ou diretamente nos items
let dados = [];
if (inputItems.length === 1 && inputItems[0].json.data) {
  // Dados estão encapsulados em 'data'
  dados = inputItems[0].json.data;
} else {
  // Dados estão diretamente nos items
  dados = inputItems.map(item => item.json);
}

console.log('Total de registros encontrados:', dados.length);

// Extrair dados únicos por semana (removendo duplicações)
const dadosSemanais = [];
const semanasProcessadas = new Set();

dados.forEach(item => {
  const chaveSemana = `${item.franqueado_id}_${item.num_semana}_${item.num_ano}`;
  
  if (!semanasProcessadas.has(chaveSemana)) {
    semanasProcessadas.add(chaveSemana);
    
    // Extrair apenas os dados relevantes da semana
    dadosSemanais.push({
      franqueado_id: item.franqueado_id,
      data_registro: item.data_registro,
      num_semana: item.num_semana,
      num_mes: item.num_mes,
      num_ano: item.num_ano,
      
      // Métricas da semana
      recomendacoes: Number(item.recomendacoes) || 0,
      sitplan: Number(item.sitplan) || 0,
      ligacoes_realizadas: Number(item.ligacoes_realizadas) || 0,
      ligacoes_atendidas: Number(item.ligacoes_atendidas) || 0,
      visita1_marcada: Number(item['1visita_marcada']) || 0,
      visita1_realizada: Number(item['1visita_realizada']) || 0,
      dentro_do_perfil: Number(item.dentro_do_perfil) || 0,
      docs_recebidos: Number(item.docs_recebidos) || 0,
      imoveis_aprovados: Number(item.imoveis_aprovados) || 0,
      visita2_marcada: Number(item['2visita_marcada']) || 0,
      visita2_realizada: Number(item['2visita_realizada']) || 0,
      ok_cliente: Number(item.ok_cliente) || 0,
      doc_enviado: Number(item.doc_enviado) || 0,
      contrato_assinados: Number(item.contrato_assinados) || 0,
      
      // Taxa de conversão calculada
      taxa_conversao_ligacao: item.ligacoes_realizadas > 0
        ? ((item.ligacoes_atendidas / item.ligacoes_realizadas) * 100).toFixed(1)
        : "0",

      // NOVOS INDICADORES
      // Diferença percentual entre Sitplan e Recomendações (pode ser negativo)
      diferenca_sitplan_recomendacoes: item.recomendacoes > 0
        ? (((item.sitplan - item.recomendacoes) / item.recomendacoes) * 100).toFixed(1)
        : (item.sitplan > 0 ? "100" : "0"),

      // Média de ligações por oportunidade (Ligações ÷ Sitplan)
      media_ligacoes_por_oportunidade: item.sitplan > 0
        ? (item.ligacoes_realizadas / item.sitplan).toFixed(1)
        : "0",

      // Dados originais completos para retornar junto
      dados_originais: item
    });
  }
});

// Ordenar por semana
dadosSemanais.sort((a, b) => a.num_semana - b.num_semana);

console.log('Semanas processadas:', dadosSemanais.map(s => s.num_semana));

// Calcular evolução semana a semana
const evolucaoSemanal = [];
for (let i = 0; i < dadosSemanais.length; i++) {
  const semanaAtual = dadosSemanais[i];
  const semanaAnterior = i > 0 ? dadosSemanais[i - 1] : null;
  
  const evolucao = {
    franqueado_id: semanaAtual.franqueado_id,
    semana: semanaAtual.num_semana,
    data: semanaAtual.data_registro,

    // Valores atuais
    recomendacoes: semanaAtual.recomendacoes,
    sitplan: semanaAtual.sitplan,
    ligacoes_realizadas: semanaAtual.ligacoes_realizadas,
    ligacoes_atendidas: semanaAtual.ligacoes_atendidas,
    taxa_conversao_ligacao: semanaAtual.taxa_conversao_ligacao + '%',

    // NOVOS INDICADORES
    diferenca_sitplan_recomendacoes: semanaAtual.diferenca_sitplan_recomendacoes + '%',
    media_ligacoes_por_oportunidade: semanaAtual.media_ligacoes_por_oportunidade,

    // Taxa de conversão do funil (recomendações -> contratos)
    taxa_conversao_funil: semanaAtual.recomendacoes > 0
      ? ((semanaAtual.contrato_assinados / semanaAtual.recomendacoes) * 100).toFixed(1) + '%'
      : '0%'
  };
  
  // Se houver semana anterior, calcular variações
  if (semanaAnterior) {
    // Variação de recomendações
    evolucao.var_recomendacoes = semanaAtual.recomendacoes - semanaAnterior.recomendacoes;
    evolucao.var_recomendacoes_pct = semanaAnterior.recomendacoes > 0
      ? ((evolucao.var_recomendacoes / semanaAnterior.recomendacoes) * 100).toFixed(1) + '%'
      : 'N/A';
    
    // Variação de sitplan
    evolucao.var_sitplan = semanaAtual.sitplan - semanaAnterior.sitplan;
    evolucao.var_sitplan_pct = semanaAnterior.sitplan > 0
      ? ((evolucao.var_sitplan / semanaAnterior.sitplan) * 100).toFixed(1) + '%'
      : 'N/A';
    
    // Variação de ligações
    evolucao.var_ligacoes = semanaAtual.ligacoes_realizadas - semanaAnterior.ligacoes_realizadas;
    evolucao.var_ligacoes_pct = semanaAnterior.ligacoes_realizadas > 0
      ? ((evolucao.var_ligacoes / semanaAnterior.ligacoes_realizadas) * 100).toFixed(1) + '%'
      : 'N/A';
    
    // Tendência geral
    const variacaoGeral = evolucao.var_recomendacoes + evolucao.var_sitplan + evolucao.var_ligacoes;
    evolucao.tendencia = variacaoGeral > 0 ? '↑ Crescente' : 
                        variacaoGeral < 0 ? '↓ Decrescente' : 
                        '→ Estável';
  } else {
    evolucao.var_recomendacoes = 0;
    evolucao.var_recomendacoes_pct = 'Primeira semana';
    evolucao.var_sitplan = 0;
    evolucao.var_sitplan_pct = 'Primeira semana';
    evolucao.var_ligacoes = 0;
    evolucao.var_ligacoes_pct = 'Primeira semana';
    evolucao.tendencia = 'Início do período';
  }
  
  evolucaoSemanal.push(evolucao);
}

// Pegar dados do primeiro item para totais e médias
const primeiroItem = dados[0] || {};

// Calcular resumo único
const resumoGeral = {
  tipo: 'RESUMO_GERAL',
  franqueado_id: primeiroItem.franqueado_id || 0,
  periodo: dadosSemanais.length > 0 
    ? `Semanas ${dadosSemanais[0].num_semana} a ${dadosSemanais[dadosSemanais.length - 1].num_semana}`
    : 'Sem dados',
  total_semanas: dadosSemanais.length,
  
  // Totais do período (usando os valores já calculados no summarize)
  total_recomendacoes: primeiroItem.sum_recomendacoes || 0,
  total_sitplan: primeiroItem.sum_sitplan || 0,
  total_ligacoes_realizadas: primeiroItem.sum_ligacoes_realizadas || 0,
  total_ligacoes_atendidas: primeiroItem.sum_ligacoes_atendidas || 0,
  total_visitas1_marcadas: primeiroItem.sum_1visita_marcada || 0,
  total_visitas1_realizadas: primeiroItem.sum_1visita_realizada || 0,
  total_contratos: primeiroItem.sum_doc_enviado || 0,
  
  // Médias do período
  media_recomendacoes: (primeiroItem.average_recomendacoes || 0).toFixed(1),
  media_sitplan: (primeiroItem.average_sitplan || 0).toFixed(1),
  media_ligacoes: (primeiroItem.average_ligacoes_realizadas || 0).toFixed(1),
  media_conversao_ligacoes: primeiroItem.sum_ligacoes_realizadas > 0
    ? ((primeiroItem.sum_ligacoes_atendidas / primeiroItem.sum_ligacoes_realizadas) * 100).toFixed(1) + '%'
    : '0%',
  
  // Análise de tendência
  tendencia_geral: analisarTendenciaGeral(dadosSemanais),
  
  // Performance do funil completo
  taxa_conversao_total: primeiroItem.sum_recomendacoes > 0
    ? ((primeiroItem.sum_doc_enviado / primeiroItem.sum_recomendacoes) * 100).toFixed(1) + '%'
    : '0%',
  
  // Melhor e pior semana
  melhor_semana: encontrarMelhorSemana(dadosSemanais),
  pior_semana: encontrarPiorSemana(dadosSemanais),
  
  // Média móvel das últimas 4 semanas
  media_movel_4_semanas: calcularMediaMovel(dadosSemanais, 4)
};

// Funções auxiliares
function analisarTendenciaGeral(dados) {
  if (dados.length < 2) return 'Dados insuficientes';
  
  const metadeFinal = dados.slice(Math.floor(dados.length / 2));
  const metadeInicial = dados.slice(0, Math.floor(dados.length / 2));
  
  const somaFinal = metadeFinal.reduce((sum, d) => sum + d.recomendacoes, 0);
  const somaInicial = metadeInicial.reduce((sum, d) => sum + d.recomendacoes, 0);
  
  if (somaFinal > somaInicial * 1.1) return '↑ Crescimento forte';
  if (somaFinal > somaInicial) return '↗ Crescimento moderado';
  if (somaFinal < somaInicial * 0.9) return '↓ Queda acentuada';
  if (somaFinal < somaInicial) return '↘ Queda moderada';
  return '→ Estável';
}

function encontrarMelhorSemana(dados) {
  if (dados.length === 0) return { semana: 0, recomendacoes: 0, data: '' };
  
  let melhor = dados[0];
  dados.forEach(d => {
    if (d.recomendacoes > melhor.recomendacoes) {
      melhor = d;
    }
  });
  return {
    semana: melhor.num_semana,
    recomendacoes: melhor.recomendacoes,
    data: melhor.data_registro
  };
}

function encontrarPiorSemana(dados) {
  if (dados.length === 0) return { semana: 0, recomendacoes: 0, data: '' };
  
  let pior = dados[0];
  dados.forEach(d => {
    if (d.recomendacoes < pior.recomendacoes) {
      pior = d;
    }
  });
  return {
    semana: pior.num_semana,
    recomendacoes: pior.recomendacoes,
    data: pior.data_registro
  };
}

function calcularMediaMovel(dados, janela) {
  if (dados.length < janela) return 'Dados insuficientes';
  
  const ultimasNSemanas = dados.slice(-janela);
  const media = {
    recomendacoes: (ultimasNSemanas.reduce((sum, d) => sum + d.recomendacoes, 0) / janela).toFixed(1),
    sitplan: (ultimasNSemanas.reduce((sum, d) => sum + d.sitplan, 0) / janela).toFixed(1),
    ligacoes: (ultimasNSemanas.reduce((sum, d) => sum + d.ligacoes_realizadas, 0) / janela).toFixed(1)
  };
  
  return media;
}

// Retornar resultados organizados
const resultados = [
  // Primeiro o resumo geral
  { json: resumoGeral },
  
  // Depois a evolução semanal
  ...evolucaoSemanal.map(e => ({ 
    json: { 
      tipo: 'EVOLUCAO_SEMANAL',
      ...e 
    } 
  })),
  
  // Por último, os dados semanais originais limpos (sem duplicação)
  ...dadosSemanais.map(s => ({
    json: {
      tipo: 'DADOS_SEMANAIS',
      ...s.dados_originais,
      // Adicionar os novos indicadores calculados
      diferenca_sitplan_recomendacoes: s.diferenca_sitplan_recomendacoes,
      media_ligacoes_por_oportunidade: s.media_ligacoes_por_oportunidade
    }
  }))
];

return resultados;