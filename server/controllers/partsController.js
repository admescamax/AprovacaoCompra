const omieClient = require('../services/omieClient');
const businessRules = require('../utils/businessRules');
const logger = require('../utils/logger');

// Mapeia produto bruto da Omie para o formato do frontend
function mapearProduto(produto) {
    const categoria = businessRules.identificarCategoria(produto.codigo);
    const precoFinal = businessRules.calcularPrecoEscamax(produto);
    return {
        codigo: produto.codigo,
        descricao: produto.descricao,
        preco: precoFinal,
        preco_original: produto.valor_unitario,
        estoque: produto.saldo_estoque || 0,
        categoria,
        url_imagem: produto.url_imagem,
    };
}

// GET /api/parts/listar — todos os produtos VP com estoque > 0
exports.listar = async (req, res) => {
    try {
        logger.info(`Listando estoque VP para: ${req.user.email}`);
        console.log(`[BACKEND] Inciando busca de produtos para ${req.user.email}`);
        const produtosOmie = await omieClient.listarTodos();
        console.log(`[BACKEND] Produtos encontrados na Omie: ${produtosOmie.length}`);
        const resultados = produtosOmie.map(mapearProduto);
        console.log(`[BACKEND] Produtos mapeados: ${resultados.length}`);
        res.json(resultados);
    } catch (error) {
        logger.error(`Erro ao listar produtos: ${error.message}`);
        console.error(`[BACKEND ERROR] Error listing products:`, error);
        res.status(500).json({ error: 'Erro ao buscar estoque.', details: error.message });
    }
};

// GET /api/parts/search?q= — busca por termo
exports.search = async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Termo de busca obrigatório.' });
    }

    try {
        logger.info(`Search: "${q}" por ${req.user.email}`);
        const produtosOmie = await omieClient.consultarProduto(q);
        const resultados = produtosOmie.map(mapearProduto);
        res.json(resultados);
    } catch (error) {
        logger.error(`Search error: ${error.message}`);
        res.status(500).json({ error: 'Erro ao buscar peças.' });
    }
};
