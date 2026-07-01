const ALCADAS_PRODUTOS = [
    {
        nivel: 1,
        papel: 'Gerente',
        valorMin: 0.01,
        valorMax: 3000,
    },
    {
        nivel: 2,
        papel: 'Gerente Sênior',
        valorMin: 3000.01,
        valorMax: 5000,
    },
    {
        nivel: 3,
        papel: 'Diretor',
        valorMin: 5000.01,
        valorMax: Infinity,
    },
];

const ETAPAS_KANBAN_PRODUTOS = {
    SOLICITADO: { codigo: '00', label: 'Solicitado' },
    EM_APROVACAO: { codigo: '01', label: 'Em Aprovação' },
    APROVADO: { codigo: '02', label: 'Aprovado' },
    ENVIADO: { codigo: '03', label: 'Enviado' },
    ENTREGUE: { codigo: '04', label: 'Entregue' },
    FATURAR: { codigo: '05', label: 'Faturar' },
    CANCELADO: { codigo: '99', label: 'Cancelado/Reprovado' },
};

const BOOTSTRAP_ADMIN_EMAILS = ['gelson.simoes@verticalparts.com.br'];

function normalizarEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function parseEmailList(value) {
    return String(value || '')
        .split(/[;,]/)
        .map(normalizarEmail)
        .filter(Boolean);
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

function obterAdminsAprovacao() {
    const envAdmins = [
        ...parseEmailList(process.env.ALCADA_PRODUTOS_ADMIN_EMAILS),
        ...parseEmailList(process.env.APPROVAL_ADMIN_EMAILS),
    ];
    const strict = String(process.env.ALCADA_PRODUTOS_STRICT || '').toUpperCase() === 'S';
    return unique(strict ? envAdmins : [...envAdmins, ...BOOTSTRAP_ADMIN_EMAILS]);
}

function obterMatrizAprovadores() {
    const admins = obterAdminsAprovacao();
    return {
        1: unique([...admins, ...parseEmailList(process.env.ALCADA_PRODUTOS_GERENTE_EMAILS)]),
        2: unique([...admins, ...parseEmailList(process.env.ALCADA_PRODUTOS_GERENTE_SENIOR_EMAILS)]),
        3: unique([...admins, ...parseEmailList(process.env.ALCADA_PRODUTOS_DIRETOR_EMAILS)]),
        faturamento: unique([...admins, ...parseEmailList(process.env.ALCADA_PRODUTOS_FATURAMENTO_EMAILS)]),
        admins,
    };
}

function obterPermissoesAprovacao(email) {
    const emailNormalizado = normalizarEmail(email);
    const matriz = obterMatrizAprovadores();
    const niveis = ALCADAS_PRODUTOS
        .filter(alcada => matriz[alcada.nivel]?.includes(emailNormalizado))
        .map(alcada => alcada.nivel);

    return {
        email: emailNormalizado,
        admin: matriz.admins.includes(emailNormalizado),
        niveis,
        podeFaturar: matriz.faturamento.includes(emailNormalizado),
    };
}

function validarAprovador(email, nivel) {
    const permissoes = obterPermissoesAprovacao(email);
    if (!permissoes.niveis.includes(Number(nivel))) {
        throw new Error(`Usuário sem permissão para decidir a ${nivel}ª alçada.`);
    }
    return permissoes;
}

function validarFaturamento(email) {
    const permissoes = obterPermissoesAprovacao(email);
    if (!permissoes.podeFaturar) {
        throw new Error('Usuário sem permissão para confirmar entrega e mover o pedido para Faturar.');
    }
    return permissoes;
}

function obterAlcadasNecessarias(valorTotal) {
    const valor = Number(valorTotal || 0);
    if (valor <= 0) {
        throw new Error('Valor total inválido para cálculo de alçadas.');
    }

    const ultimaAlcada = ALCADAS_PRODUTOS.find(alcada => valor >= alcada.valorMin && valor <= alcada.valorMax);
    const nivelMaximo = ultimaAlcada?.nivel || 3;
    return ALCADAS_PRODUTOS.filter(alcada => alcada.nivel <= nivelMaximo);
}

function criarFluxoAprovacaoProdutos({ valorTotal, origem = 'checkout' }) {
    const alcadas = obterAlcadasNecessarias(valorTotal);
    return {
        modulo: 'Produtos',
        origem,
        valorTotal: Number(valorTotal || 0),
        status: 'em_aprovacao',
        etapaAtual: ETAPAS_KANBAN_PRODUTOS.EM_APROVACAO.codigo,
        etapaLabel: ETAPAS_KANBAN_PRODUTOS.EM_APROVACAO.label,
        alcadaAtual: alcadas[0].nivel,
        alcadas: alcadas.map(alcada => ({
            nivel: alcada.nivel,
            papel: alcada.papel,
            status: 'pendente',
            aprovadoEm: null,
            aprovadoPor: null,
            motivoReprovacao: null,
        })),
        historico: [
            {
                evento: 'fluxo.iniciado',
                etapa: ETAPAS_KANBAN_PRODUTOS.EM_APROVACAO.codigo,
                criadoEm: new Date().toISOString(),
            },
        ],
    };
}

function registrarDecisao(fluxo, { nivel, decisao, usuario, motivo = '' }) {
    if (!fluxo || fluxo.status !== 'em_aprovacao') {
        throw new Error('Fluxo de aprovação não está aberto para decisão.');
    }
    if (Number(nivel) !== Number(fluxo.alcadaAtual)) {
        throw new Error(`A decisão esperada é da ${fluxo.alcadaAtual}ª alçada.`);
    }

    const alcada = fluxo.alcadas.find(item => Number(item.nivel) === Number(nivel));
    if (!alcada) throw new Error(`Alçada ${nivel} não pertence a este fluxo.`);

    const decisaoNormalizada = String(decisao || '').toLowerCase();
    if (decisaoNormalizada === 'reprovar') {
        alcada.status = 'reprovado';
        alcada.aprovadoPor = usuario || null;
        alcada.motivoReprovacao = motivo || null;
        fluxo.status = 'reprovado';
        fluxo.etapaAtual = ETAPAS_KANBAN_PRODUTOS.CANCELADO.codigo;
        fluxo.etapaLabel = ETAPAS_KANBAN_PRODUTOS.CANCELADO.label;
        fluxo.historico.push({
            evento: 'fluxo.reprovado',
            nivel,
            usuario: usuario || null,
            motivo: motivo || null,
            criadoEm: new Date().toISOString(),
        });
        return fluxo;
    }

    if (decisaoNormalizada !== 'aprovar') {
        throw new Error('Decisão inválida. Use aprovar ou reprovar.');
    }

    alcada.status = 'aprovado';
    alcada.aprovadoEm = new Date().toISOString();
    alcada.aprovadoPor = usuario || null;
    fluxo.historico.push({
        evento: 'alcada.aprovada',
        nivel,
        usuario: usuario || null,
        criadoEm: new Date().toISOString(),
    });

    const proxima = fluxo.alcadas.find(item => item.status === 'pendente');
    if (proxima) {
        fluxo.alcadaAtual = proxima.nivel;
        return fluxo;
    }

    fluxo.status = 'aprovado';
    fluxo.alcadaAtual = null;
    fluxo.etapaAtual = ETAPAS_KANBAN_PRODUTOS.APROVADO.codigo;
    fluxo.etapaLabel = ETAPAS_KANBAN_PRODUTOS.APROVADO.label;
    fluxo.historico.push({
        evento: 'fluxo.aprovado',
        etapa: ETAPAS_KANBAN_PRODUTOS.APROVADO.codigo,
        criadoEm: new Date().toISOString(),
    });
    return fluxo;
}

function confirmarEntrega(fluxo) {
    const atualizado = {
        ...fluxo,
        etapaAtual: ETAPAS_KANBAN_PRODUTOS.FATURAR.codigo,
        etapaLabel: ETAPAS_KANBAN_PRODUTOS.FATURAR.label,
        historico: [
            ...(fluxo?.historico || []),
            {
                evento: 'produto.entregue',
                etapa: ETAPAS_KANBAN_PRODUTOS.ENTREGUE.codigo,
                criadoEm: new Date().toISOString(),
            },
            {
                evento: 'financeiro.faturar.solicitado',
                etapa: ETAPAS_KANBAN_PRODUTOS.FATURAR.codigo,
                criadoEm: new Date().toISOString(),
            },
        ],
    };
    return atualizado;
}

module.exports = {
    ALCADAS_PRODUTOS,
    ETAPAS_KANBAN_PRODUTOS,
    obterAlcadasNecessarias,
    criarFluxoAprovacaoProdutos,
    registrarDecisao,
    confirmarEntrega,
    obterPermissoesAprovacao,
    validarAprovador,
    validarFaturamento,
};
