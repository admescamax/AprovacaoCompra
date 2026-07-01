# Arquitetura Multi-Vendor Escamax

## Fluxo logico

1. Usuario valida a compra por `Revenda` ou `Atendimento a Contrato`.
2. Em `Revenda`, a proposta Omie define o teto financeiro de 70%.
3. Em `Atendimento a Contrato`, o contrato validado por tags libera o fluxo sem teto de 70%.
4. Usuario informa `codigo_verticalparts`, `codigo_fornecedor`, fornecedor, descricao, quantidade desejada e preco concorrente.
5. Sistema consulta `omie_produtos` pelo `codigo_verticalparts` para obter preco VP e estoque atual.
6. Split:
   - Se `estoque_vp == 0`, 100% vai para carrinho do fornecedor.
   - Se `0 < estoque_vp < quantidade_desejada`, VP recebe o saldo disponivel e o fornecedor recebe o excedente.
   - Se `estoque_vp >= quantidade_desejada`, 100% vai para carrinho VerticalParts.
7. Carrinho VerticalParts segue o checkout B2B atual.
8. Carrinhos de terceiros ficam isolados por fornecedor e devem virar pedidos externos/auditoria em etapa posterior.

## Tabelas sugeridas

### fornecedores

```sql
create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
```

### fornecedor_produtos

```sql
create table fornecedor_produtos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references fornecedores(id),
  codigo_verticalparts text not null,
  codigo_fornecedor text not null,
  descricao text not null,
  preco_concorrente numeric(15,2) not null default 0,
  unidade text default 'UN',
  ativo boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (fornecedor_id, codigo_fornecedor)
);
```

### multivendor_carrinhos

```sql
create table multivendor_carrinhos (
  id uuid primary key default gen_random_uuid(),
  filial text not null,
  finalidade text not null,
  validacao_tipo text not null,
  validacao_numero text not null,
  valor_proposta numeric(15,2),
  limite_70 numeric(15,2),
  status text not null default 'rascunho',
  created_at timestamptz not null default now()
);
```

### multivendor_itens

```sql
create table multivendor_itens (
  id uuid primary key default gen_random_uuid(),
  carrinho_id uuid not null references multivendor_carrinhos(id),
  fornecedor_id uuid references fornecedores(id),
  codigo_verticalparts text not null,
  codigo_fornecedor text,
  descricao text not null,
  quantidade_desejada numeric(15,3) not null,
  estoque_vp_no_split numeric(15,3) not null,
  quantidade_vp numeric(15,3) not null default 0,
  quantidade_fornecedor numeric(15,3) not null default 0,
  preco_vp numeric(15,2) not null default 0,
  preco_concorrente numeric(15,2) not null default 0,
  diferenca_unitaria numeric(15,2) generated always as (preco_concorrente - preco_vp) stored,
  created_at timestamptz not null default now()
);
```

## Regras de seguranca

- RLS por usuario/filial antes de expor carrinhos persistidos.
- Revalidar estoque VP no backend antes de concluir pedido externo.
- Revalidar teto de 70% no backend para Revenda.
- Contrato nao aplica teto de 70%, mas exige tag aprovada no cliente vinculado.

## Contratos de API sugeridos

### POST /api/multivendor/split

Entrada:

```json
{
  "unidade": "SAOPAULO",
  "finalidade": "Revenda",
  "pedidoVendaRef": "123",
  "contratoRef": null,
  "codigoVerticalParts": "VPEL-150",
  "codigoFornecedor": "ABC-001",
  "fornecedor": "Fornecedor Externo",
  "descricao": "Descricao comercial",
  "quantidadeDesejada": 150,
  "precoConcorrente": 1.00
}
```

Responsabilidade:

- Revalidar Pedido ou Contrato no Omie da filial correspondente.
- Consultar estoque VP atualizado pelo `codigoVerticalParts`.
- Calcular `quantidade_vp` e `quantidade_fornecedor`.
- Em Revenda, bloquear se o total acumulado dos itens concorrentes ultrapassar `limite_70`.
- Retornar os dois destinos isolados para a interface.

### POST /api/multivendor/checkout-fornecedor

Responsabilidade futura:

- Persistir o carrinho externo por fornecedor.
- Gerar trilha de auditoria da decisao de split.
- Nao misturar itens de fornecedores terceiros com o pedido interno da VerticalParts.

## Indices recomendados

```sql
create index fornecedor_produtos_codigo_vp_idx on fornecedor_produtos (codigo_verticalparts);
create index multivendor_carrinhos_filial_status_idx on multivendor_carrinhos (filial, status);
create index multivendor_itens_carrinho_idx on multivendor_itens (carrinho_id);
```
