// server/utils/businessRules.js

function calcularPrecoEscamax(produtoOmie) {
    const desconto = 0.25; // 25% de desconto fixo
    const precoOriginal = produtoOmie.valor_unitario;

    // Ensure we return a number
    return precoOriginal * (1 - desconto);
}

function identificarCategoria(codigo) {
    if (!codigo) return 'Outros';

    const code = codigo.toUpperCase();

    if (code.startsWith('VPB-')) return 'BST/Monarch';
    if (code.startsWith('VPEL-')) return 'Elevadores';
    if (code.startsWith('VPER-')) return 'Escada/Esteira';

    // Corrimãos: VP-, VPP-, VPPU-
    if (
        code.startsWith('VPPU-') ||
        code.startsWith('VPP-') ||
        code.startsWith('VP-')
    ) {
        return 'Corrimãos';
    }

    return 'Outros';
}

module.exports = {
    calcularPrecoEscamax,
    identificarCategoria
};
