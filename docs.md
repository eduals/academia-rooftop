

## Use os seguintes objetivos e envie o label para o endpoint
 getPrincipaisObjetivos: function() {
      return [
          { value: 'quero_investir_em_minha_empresa_usando_meu_imovel', label: 'Quero investir em minha empresa' },
          { value: 'quero_quitar_as_dividas_usando_meu_imovel', label: 'Quero quitar as dívidas usando meu imóvel' },
          { value: 'quero_somente_vender_meu_imovel', label: 'Quero somente vender meu imóvel' },
          { value: 'tenho_outros_objetivos_financeiros', label: 'Tenho outros objetivos financeiros' },
          { value: 'quero_comprar_imoveis_rooftop', label: 'Quero comprar imóveis Rooftop' },
          { value: 'Quero reduzir o valor da minha dívida', label: 'Quero reduzir o valor da minha dívida' },
          { value: 'Quero regularizar pendências jurídicas', label: 'Quero regularizar pendências jurídicas' }
      ];
    },

## Use os seguintes tipos de imoveis
'tipo_de_imovel': [
    {"label":"Apartamento","value":"Apartamento","displayOrder":0},
    {"label":"Apartamento Duplex","value":"Apartamento Duplex","displayOrder":1},
    {"label":"Apartamento Cobertura","value":"Apartamento Cobertura","displayOrder":2},
    {"label":"Casa de Rua","value":"Casa","displayOrder":3},
    {"label":"Casa em Condomínio","value":"Casa em Condomínio","displayOrder":4},
    {"label":"Terreno","value":"Terreno","displayOrder":5},
    {"label":"Sala Comercial","value":"Sala Comercial","displayOrder":6}
]

## Use essas faixas de valores ao inves de inserir o valor do imovel
Abaixo de R$ 500 mil: Abaixo de R$ 500 mil
De R$ 501 mil a R$ 800 mil: De R$ 501 mil a R$ 800 mil
De R$ 801 mil a R$ 1 milhão: De R$ 801 mil a R$ 1 milhão
De R$ 1 milhão a R$ 3 milhões: De R$ 1 milhão a R$ 3 milhões
De R$ 3 milhões a R$ 6 milhões: De R$ 3 milhões a R$ 6 milhões