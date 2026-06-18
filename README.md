# Portal Escamax

Este projeto consiste em um Portal de Peças para a Escamax, integrado com a API da Omie e autenticação via E-mail (Resend).

## Pré-requisitos
- **Node.js** (Versão LTS): [Download aqui](https://nodejs.org/)

## Como Iniciar (Windows)

A maneira mais fácil é executar o script automático:

1. Dê um duplo clique no arquivo **`start_escamax.bat`** na pasta raiz do projeto.
2. O script irá:
   - Verificar se o Node.js está instalado.
   - Instalar as dependências do Servidor e iniciá-lo em uma nova janela.
   - Instalar as dependências do Cliente e iniciá-lo.
   - Abrir o navegador automaticamente.

## Credenciais de Teste

- **URL**: http://localhost:5173
- **Login**: `adm@escamax.com.br`
- **Código 2FA**:
  - Verifique o e-mail (se a API Key do Resend estiver válida).
  - OU verifique o terminal do "Escamax Backend" (o código é logado lá).
  - OU use o código de emergência: `123456`.

## Solução de Problemas

**Erro: "npm não é reconhecido"**
- Instale o Node.js e reinicie o computador.

**Erro: Tela branca ou "Site não acessível"**
- Certifique-se de que os terminais pretos (Backend e Frontend) continuam abertos. Não os feche.

**Erro na Busca**
- Se a busca não retornar resultados, verifique se o terminal do Backend apresenta erros.
- O sistema usa dados "Mock" (fictícios) se não conseguir conectar na Omie, então sempre deve retornar algo para testes como "VPER", "VPEL".
