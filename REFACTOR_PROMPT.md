# 🔧 PROMPT PARA REFACTORING ASSISTANT

🎯 Objetivo:
Refatorar meu projeto para torná-lo responsivo/mobile, preservando totalmente a versão desktop e sem quebrar a lógica dos elementos de “crachá” (badges).

---

## 1. Identificação de CSS crítico para mobile
- Localize trechos que possuem:
  - Larguras fixas (px)
  - Tabelas horizontais largas
  - Cards que explodem o container
  - Cabeçalhos inflexíveis
- Para cada trecho indique:
  - O impacto no mobile
  - A solução aplicada (mobile-first com media queries)

---

## 2. Ajustes de Layout com Flexbox/Grid
- Reestruture se necessário:
  - Headers
  - Sidebars
  - Listas
  - Cards
- Regras obrigatórias:
  - Não alterar o layout desktop existente
  - Todas as mudanças devem estar dentro de @media (max-width: 768px)
  - Usar flex-direction: column e grids fluidos apenas no mobile

---

## 3. Lógica de Crachás (Badges)
Garanta que o assistente:

1. Identifique corretamente elementos tipo crachá analisando:
   - Nome das classes (badge, crachá, tag, label)
   - Presença de cores e formatos capsulares
   - Elementos com texto curto + ícone

2. Adapte para o mobile, aplicando:
   - max-width: 100%
   - overflow: hidden
   - text-overflow: ellipsis
   - white-space: nowrap
   - display: inline-flex

3. Teste casos extremos, incluindo:
   - Crachá com texto longo demais
   - Crachá dentro de tabela
   - Crachá dentro de card
   - Crachá dentro de header estreito

---

## 4. Critérios de Aceitação
- Layout permanece 100% correto no desktop.
- Nenhum componente vaza horizontalmente no mobile.
- Crachás permanecem reconhecíveis e não estouram containers.
- Tabelas e cards são totalmente utilizáveis em telas pequenas.
- Ajustes seguem mobile-first sem reescrever o desktop.

---

## 5. Checklist Final
- [ ] Media queries aplicadas corretamente
- [ ] Componentes funcionais em telas pequenas
- [ ] Crachás preservados
- [ ] Nenhum efeito colateral no desktop
- [ ] Código CSS limpo e documentado

---

## 5.1 CSS Checklist
- [ ] Todas as larguras fixas foram substituídas por limites fluidos.
- [ ] Textos longos não estouram containers.
- [ ] Padding/margins não criam barras de rolagem horizontal.
- [ ] Media queries não sobrepõem regras do desktop.

## 5.2 Crachás Checklist
- [ ] O sistema identifica corretamente elementos do tipo “crachá”.
- [ ] Crachás não transbordam containers estreitos.
- [ ] Crachás continuam visuais e legíveis.
- [ ] Crachás não deformam o layout de cards, listas ou headers.

## 5.3 JS Checklist
- [ ] Scripts dependentes de hover foram adaptados.
- [ ] Não existem cálculos de tamanho rígidos.
- [ ] A lógica de resize foi revisada.
