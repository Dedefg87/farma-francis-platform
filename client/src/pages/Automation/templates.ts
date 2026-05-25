// Templates de fluxos de automação
// Adicione novos templates aqui

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  iconName: string;
  color: string;
  nodes: any[];
  edges: any[];
}

// Helper to generate unique IDs
let _id = 0;
const nid = () => `node-${++_id}`;

export const flowTemplates: FlowTemplate[] = [
  // ============================================================
  // TEMPLATE 1 — Fluxo Básico de Atendimento (Iniciante)
  // Objetivo: receber mensagem > identificar cliente > registrar tarefa
  // ============================================================
  (() => {
    _id = 0;
    const nodes = [
      {
        id: nid(),
        type: 'customNode',
        position: { x: 120, y: 100 },
        data: {
          label: 'Webhook — Nova Mensagem',
          nodeType: 'webhook-trigger',
          inputs: [],
          outputs: [{ id: 'out', label: 'Dados recebidos', type: 'success' }],
          config: [
            { key: 'method', label: 'Método HTTP', type: 'select', options: [
              { value: 'POST', label: 'POST' },
              { value: 'GET', label: 'GET' },
            ], defaultValue: 'POST' },
            { key: 'path', label: 'Caminho do Webhook', type: 'string', defaultValue: '/api/webhook/mensagem' },
          ],
        },
      },
      {
        id: nid(),
        type: 'customNode',
        position: { x: 380, y: 100 },
        data: {
          label: 'IF — Cliente Existe?',
          nodeType: 'if-node',
          inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
          outputs: [
            { id: 'true', label: 'Sim (existe)', type: 'success' },
            { id: 'false', label: 'Não (novo)', type: 'error' },
          ],
          config: [
            { key: 'conditions', label: 'Condições (JSON)', type: 'json', defaultValue: { field: 'contact.id', operator: 'exists' } },
          ],
        },
      },
      {
        id: nid(),
        type: 'customNode',
        position: { x: 640, y: 40 },
        data: {
          label: 'HTTP — Buscar Contato',
          nodeType: 'http-request-node',
          inputs: [{ id: 'in', label: 'ID do cliente', type: 'data' }],
          outputs: [{ id: 'out', label: 'Dados do contato', type: 'success' }],
          config: [
            { key: 'method', label: 'Método', type: 'select', options: [
              { value: 'GET', label: 'GET' },
            ], defaultValue: 'GET' },
            { key: 'url', label: 'URL da API', type: 'string', defaultValue: '/api/contatos/{{$json.contact.id}}' },
          ],
        },
      },
      {
        id: nid(),
        type: 'customNode',
        position: { x: 640, y: 180 },
        data: {
          label: 'HTTP — Criar Contato',
          nodeType: 'http-request-node',
          inputs: [{ id: 'in', label: 'Dados do cliente', type: 'data' }],
          outputs: [{ id: 'out', label: 'Contato criado', type: 'success' }],
          config: [
            { key: 'method', label: 'Método', type: 'select', options: [
              { value: 'POST', label: 'POST' },
            ], defaultValue: 'POST' },
            { key: 'url', label: 'URL da API', type: 'string', defaultValue: '/api/contatos' },
          ],
        },
      },
      {
        id: nid(),
        type: 'customNode',
        position: { x: 900, y: 100 },
        data: {
          label: 'Set — Organizar Dados',
          nodeType: 'set-node',
          inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
          outputs: [{ id: 'out', label: 'Dados organizados', type: 'success' }],
          config: [
            { key: 'mode', label: 'Modo', type: 'select', options: [
              { value: 'manual', label: 'Manual' },
              { value: 'auto', label: 'Automático' },
            ], defaultValue: 'manual' },
          ],
        },
      },
      {
        id: nid(),
        type: 'customNode',
        position: { x: 1160, y: 100 },
        data: {
          label: 'HTTP — Criar Tarefa',
          nodeType: 'http-request-node',
          inputs: [{ id: 'in', label: 'Dados do atendimento', type: 'data' }],
          outputs: [{ id: 'out', label: 'Tarefa criada', type: 'success' }],
          config: [
            { key: 'method', label: 'Método', type: 'select', options: [
              { value: 'POST', label: 'POST' },
            ], defaultValue: 'POST' },
            { key: 'url', label: 'URL da API', type: 'string', defaultValue: '/api/tarefas' },
          ],
        },
      },
    ];

    const edges = [
      { id: 'e1', source: nodes[0].id, target: nodes[1].id, sourceHandle: 'out', targetHandle: 'in', type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },
      { id: 'e2', source: nodes[1].id, target: nodes[2].id, sourceHandle: 'true', targetHandle: 'in', type: 'custom', animated: false, style: { stroke: '#22c55e', strokeWidth: 2 }, label: 'Sim' },
      { id: 'e3', source: nodes[1].id, target: nodes[3].id, sourceHandle: 'false', targetHandle: 'in', type: 'custom', animated: false, style: { stroke: '#ef4444', strokeWidth: 2 }, label: 'Não' },
      { id: 'e4', source: nodes[2].id, target: nodes[4].id, sourceHandle: 'out', targetHandle: 'in', type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },
      { id: 'e5', source: nodes[3].id, target: nodes[4].id, sourceHandle: 'out', targetHandle: 'in', type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },
      { id: 'e6', source: nodes[4].id, target: nodes[5].id, sourceHandle: 'out', targetHandle: 'in', type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },
    ];

    return { id: 'fluxo-basico-atendimento', name: 'Fluxo Básico de Atendimento', description: 'Recebe mensagem via webhook, identifica se o cliente existe no CRM, cria contato se necessário e registra tarefa automaticamente. Ideal para iniciar automação de WhatsApp.', iconName: 'Zap', color: '#3b82f6', nodes, edges };
  })(),

  // ============================================================
  // TEMPLATE 2 — Atendimento Inteligente Unificado (Completo)
  // 12 nós: trigger > buscar contato > if existe > criar >
 	// organizar > if horário > boas-vindas/ausência > tarefa >
  // atribuir agente > fim
  // ============================================================
  (() => {
    _id = 0;

    // --- NÓS ---

    // [0] TRIGGER — Nova Mensagem (WA/IG)
    const nTrigger = {
      id: nid(),
      type: 'customNode',
      position: { x: 80, y: 200 },
      data: {
        label: '📩 Nova Mensagem (WA/IG)',
        nodeType: 'webhook-trigger',
        inputs: [],
        outputs: [{ id: 'out', label: 'Dados recebidos', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método HTTP', type: 'select',
            options: [{ value: 'POST', label: 'POST' }, { value: 'GET', label: 'GET' }],
            defaultValue: 'POST',
          },
          {
            key: 'path', label: 'Caminho do Webhook', type: 'string',
            defaultValue: '/api/webhook/mensagem',
          },
        ],
      },
    };

    // [1] HTTP — Buscar Contato
    const nBuscarContato = {
      id: nid(),
      type: 'customNode',
      position: { x: 340, y: 200 },
      data: {
        label: '🔍 Buscar Contato',
        nodeType: 'http-request-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Resultado', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método', type: 'select',
            options: [{ value: 'GET', label: 'GET' }],
            defaultValue: 'GET',
          },
          {
            key: 'url', label: 'URL da API', type: 'string',
            defaultValue: '/api/contatos?telefone={{$json.telefone}}',
          },
          {
            key: 'headers', label: 'Headers (JSON)', type: 'json',
            defaultValue: { 'Content-Type': 'application/json' },
          },
        ],
      },
    };

    // [2] IF — Contato Existe?
    const nIfContato = {
      id: nid(),
      type: 'customNode',
      position: { x: 600, y: 200 },
      data: {
        label: '❓ Contato Existe?',
        nodeType: 'if-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [
          { id: 'true', label: 'Sim (existe)', type: 'success' },
          { id: 'false', label: 'Não (novo)', type: 'error' },
        ],
        config: [
          {
            key: 'conditions', label: 'Condições (JSON)', type: 'json',
            defaultValue: { field: 'found', operator: '===', value: true },
          },
        ],
      },
    };

    // [3] HTTP — Criar Contato (quando NÃO existe)
    const nCriarContato = {
      id: nid(),
      type: 'customNode',
      position: { x: 880, y: 340 },
      data: {
        label: '👤 Criar Contato',
        nodeType: 'http-request-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Contato criado', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método', type: 'select',
            options: [{ value: 'POST', label: 'POST' }],
            defaultValue: 'POST',
          },
          {
            key: 'url', label: 'URL da API', type: 'string',
            defaultValue: '/api/contatos',
          },
          {
            key: 'body', label: 'Body (JSON)', type: 'json',
            defaultValue: {
              nome: '{{$json.nome}}',
              telefone: '{{$json.telefone}}',
              origem: '{{$json.origem}}',
            },
          },
        ],
      },
    };

    // [4] SET — Organizar Dados
    const nOrganizarDados = {
      id: nid(),
      type: 'customNode',
      position: { x: 1160, y: 200 },
      data: {
        label: '📋 Organizar Dados',
        nodeType: 'set-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Dados organizados', type: 'success' }],
        config: [
          {
            key: 'mode', label: 'Modo', type: 'select',
            options: [{ value: 'manual', label: 'Manual' }, { value: 'auto', label: 'Automático' }],
            defaultValue: 'manual',
          },
          {
            key: 'fields', label: 'Campos (JSON)', type: 'json',
            defaultValue: {
              contato_id: '{{$json.id}}',
              nome: '{{$json.nome}}',
              telefone: '{{$json.telefone}}',
              mensagem: '{{$json.mensagem}}',
              origem: '{{$json.origem}}',
              timestamp: '{{$now}}',
            },
          },
        ],
      },
    };

    // [5] IF — Horário Comercial?
    const nIfHorario = {
      id: nid(),
      type: 'customNode',
      position: { x: 1420, y: 200 },
      data: {
        label: '🕐 Horário Comercial?',
        nodeType: 'if-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [
          { id: 'true', label: 'Dentro (08-18h)', type: 'success' },
          { id: 'false', label: 'Fora do horário', type: 'error' },
        ],
        config: [
          {
            key: 'conditions', label: 'Condições (JSON)', type: 'json',
            defaultValue: {
              condition: 'working_hours',
              schedule: { start: '08:00', end: '18:00' },
            },
          },
        ],
      },
    };

    // [6] HTTP — Enviar Boas-Vindas
    const nBoasVindas = {
      id: nid(),
      type: 'customNode',
      position: { x: 1700, y: 100 },
      data: {
        label: '✅ Enviar Boas-Vindas',
        nodeType: 'http-request-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Enviado', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método', type: 'select',
            options: [{ value: 'POST', label: 'POST' }],
            defaultValue: 'POST',
          },
          {
            key: 'url', label: 'URL da API', type: 'string',
            defaultValue: '/api/mensagens/enviar',
          },
          {
            key: 'body', label: 'Body (JSON)', type: 'json',
            defaultValue: {
              telefone: '{{$json.telefone}}',
              mensagem: 'Olá! Como posso ajudar você hoje?',
            },
          },
        ],
      },
    };

    // [7] HTTP — Mensagem de Ausência
    const nAusencia = {
      id: nid(),
      type: 'customNode',
      position: { x: 1700, y: 320 },
      data: {
        label: '🌙 Mensagem de Ausência',
        nodeType: 'http-request-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Enviado', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método', type: 'select',
            options: [{ value: 'POST', label: 'POST' }],
            defaultValue: 'POST',
          },
          {
            key: 'url', label: 'URL da API', type: 'string',
            defaultValue: '/api/mensagens/enviar',
          },
          {
            key: 'body', label: 'Body (JSON)', type: 'json',
            defaultValue: {
              telefone: '{{$json.telefone}}',
              mensagem: 'Estamos fora do horário comercial. Seu atendimento será respondido assim que possível.',
            },
          },
        ],
      },
    };

    // [8] MERGE — Juntar Boas-Vindas + Ausência
    const nMergeMensagens = {
      id: nid(),
      type: 'customNode',
      position: { x: 1960, y: 200 },
      data: {
        label: '🔀 Merge Mensagens',
        nodeType: 'set-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Dados unificados', type: 'success' }],
        config: [
          {
            key: 'mode', label: 'Modo', type: 'select',
            options: [{ value: 'auto', label: 'Automático' }],
            defaultValue: 'auto',
          },
        ],
      },
    };

    // [9] HTTP — Criar Tarefa
    const nCriarTarefa = {
      id: nid(),
      type: 'customNode',
      position: { x: 2220, y: 200 },
      data: {
        label: '📌 Criar Tarefa',
        nodeType: 'http-request-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Tarefa criada', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método', type: 'select',
            options: [{ value: 'POST', label: 'POST' }],
            defaultValue: 'POST',
          },
          {
            key: 'url', label: 'URL da API', type: 'string',
            defaultValue: '/api/tarefas',
          },
          {
            key: 'body', label: 'Body (JSON)', type: 'json',
            defaultValue: {
              titulo: 'Atendimento automático',
              descricao: 'Mensagem recebida: {{$json.mensagem}}',
              status: 'aberta',
              contato_id: '{{$json.contato_id}}',
              telefone: '{{$json.telefone}}',
              origem: '{{$json.origem}}',
              timestamp: '{{$now}}',
            },
          },
        ],
      },
    };

    // [10] HTTP — Atribuir Agente
    const nAtribuirAgente = {
      id: nid(),
      type: 'customNode',
      position: { x: 2480, y: 200 },
      data: {
        label: '👨‍💼 Atribuir Agente',
        nodeType: 'http-request-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Atribuído', type: 'success' }],
        config: [
          {
            key: 'method', label: 'Método', type: 'select',
            options: [{ value: 'PUT', label: 'PUT' }],
            defaultValue: 'PUT',
          },
          {
            key: 'url', label: 'URL da API', type: 'string',
            defaultValue: '/api/atendimentos/atribuir',
          },
          {
            key: 'body', label: 'Body (JSON)', type: 'json',
            defaultValue: {
              telefone: '{{$json.telefone}}',
              mensagem: 'Novo atendimento disponível.',
            },
          },
        ],
      },
    };

    // [11] SET — Fim do Fluxo
    const nFim = {
      id: nid(),
      type: 'customNode',
      position: { x: 2740, y: 200 },
      data: {
        label: '🏁 Fim do Fluxo',
        nodeType: 'set-node',
        inputs: [{ id: 'in', label: 'Dados', type: 'data' }],
        outputs: [{ id: 'out', label: 'Finalizado', type: 'success' }],
        config: [
          {
            key: 'mode', label: 'Modo', type: 'select',
            options: [{ value: 'manual', label: 'Manual' }],
            defaultValue: 'manual',
          },
          {
            key: 'fields', label: 'Campos (JSON)', type: 'json',
            defaultValue: { status: 'finalizado' },
          },
        ],
      },
    };

    const nodes = [
      nTrigger, nBuscarContato, nIfContato, nCriarContato,
      nOrganizarDados, nIfHorario, nBoasVindas, nAusencia,
      nMergeMensagens, nCriarTarefa, nAtribuirAgente, nFim,
    ];

    // --- CONEXÕES (edges) ---
    const edges = [
      // 0 → 1: Trigger → Buscar Contato
      { id: 'e01', source: nTrigger.id, target: nBuscarContato.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 1 → 2: Buscar Contato → IF Contato Existe?
      { id: 'e12', source: nBuscarContato.id, target: nIfContato.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 2 → 3: IF false → Criar Contato (não existe)
      { id: 'e23', source: nIfContato.id, target: nCriarContato.id,
        sourceHandle: 'false', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#ef4444', strokeWidth: 2 },
        label: 'Não' },

      // 2 → 4: IF true → Organizar Dados (existe, pula criação)
      { id: 'e24', source: nIfContato.id, target: nOrganizarDados.id,
        sourceHandle: 'true', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#22c55e', strokeWidth: 2 },
        label: 'Sim' },

      // 3 → 4: Criar Contato → Organizar Dados (veio da criação)
      { id: 'e34', source: nCriarContato.id, target: nOrganizarDados.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 4 → 5: Organizar Dados → IF Horário Comercial?
      { id: 'e45', source: nOrganizarDados.id, target: nIfHorario.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 5 → 6: IF true → Boas-Vindas (dentro do horário)
      { id: 'e56', source: nIfHorario.id, target: nBoasVindas.id,
        sourceHandle: 'true', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#22c55e', strokeWidth: 2 },
        label: '08-18h' },

      // 5 → 7: IF false → Ausência (fora do horário)
      { id: 'e57', source: nIfHorario.id, target: nAusencia.id,
        sourceHandle: 'false', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#ef4444', strokeWidth: 2 },
        label: 'Fora' },

      // 6 → 8: Boas-Vindas → Merge
      { id: 'e68', source: nBoasVindas.id, target: nMergeMensagens.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 7 → 8: Ausência → Merge
      { id: 'e78', source: nAusencia.id, target: nMergeMensagens.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 8 → 9: Merge → Criar Tarefa
      { id: 'e89', source: nMergeMensagens.id, target: nCriarTarefa.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 9 → 10: Criar Tarefa → Atribuir Agente
      { id: 'e910', source: nCriarTarefa.id, target: nAtribuirAgente.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },

      // 10 → 11: Atribuir Agente → Fim do Fluxo
      { id: 'e1011', source: nAtribuirAgente.id, target: nFim.id,
        sourceHandle: 'out', targetHandle: 'in',
        type: 'custom', animated: false, style: { stroke: '#94a3b8', strokeWidth: 2 } },
    ];

    return {
      id: 'atendimento-inteligente-unificado',
      name: '🤖 Atendimento Inteligente Unificado',
      description: 'Fluxo completo de 12 nós para atendimento automático via WhatsApp e Instagram. Recebe mensagem, busca/cria contato no CRM, verifica horário comercial (08-18h), envia boas-vindas ou mensagem de ausência, cria tarefa no sistema e atribui agente. Pronto para uso.',
      iconName: 'Bot',
      color: '#8b5cf6',
      nodes,
      edges,
    };
  })(),
];
