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
      {
        id: 'e1',
        source: nodes[0].id,
        target: nodes[1].id,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'custom',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      },
      {
        id: 'e2',
        source: nodes[1].id,
        target: nodes[2].id,
        sourceHandle: 'true',
        targetHandle: 'in',
        type: 'custom',
        animated: false,
        style: { stroke: '#22c55e', strokeWidth: 2 },
        label: 'Sim',
      },
      {
        id: 'e3',
        source: nodes[1].id,
        target: nodes[3].id,
        sourceHandle: 'false',
        targetHandle: 'in',
        type: 'custom',
        animated: false,
        style: { stroke: '#ef4444', strokeWidth: 2 },
        label: 'Não',
      },
      {
        id: 'e4',
        source: nodes[2].id,
        target: nodes[4].id,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'custom',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      },
      {
        id: 'e5',
        source: nodes[3].id,
        target: nodes[4].id,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'custom',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      },
      {
        id: 'e6',
        source: nodes[4].id,
        target: nodes[5].id,
        sourceHandle: 'out',
        targetHandle: 'in',
        type: 'custom',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      },
    ];

    return {
      id: 'fluxo-basico-atendimento',
      name: 'Fluxo Básico de Atendimento',
      description: 'Recebe mensagem via webhook, identifica se o cliente existe no CRM, cria contato se necessário e registra tarefa automaticamente. Ideal para iniciar automação de WhatsApp.',
      iconName: 'Zap',
      color: '#3b82f6',
      nodes,
      edges,
    };
  })(),
];
