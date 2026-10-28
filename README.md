# Inventário de TI

Sistema de inventário de equipamentos, **100% gratuito**: a planilha do Google
é o banco de dados e o app roda no próprio Google (Apps Script) ou na Vercel.

Campos: Nome da Máquina, Tipo (Notebook / Desktop / Monitor), Número de Série,
Empresa, Usuário, Setor, Processador, Memória RAM, Armazenamento e
Status (Em Uso / Em Estoque / Manutenção).

O app tem busca, filtros por tipo/status/empresa, ordenação por coluna,
contadores, cadastro/edição/exclusão, bloqueio de número de série repetido e
exportação para CSV (abre no Excel). Funciona no celular.

```
index.html            o app (uma página só, sem dependências)
apps-script/Code.gs   o "servidor" que lê e grava na planilha
```

## 1. Criar a planilha (obrigatório, 5 minutos)

1. Crie uma planilha nova em <https://sheets.new>.
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole o conteúdo de `apps-script/Code.gs`.
4. Clique em **+ → HTML**, dê o nome `index` e cole o conteúdo de `index.html`.
5. Selecione a função `configurar` e clique em **Executar**. Autorize o acesso
   (em "O Google não verificou este app": *Avançado → Acessar*). É o seu próprio script.
   A aba **Inventario** é criada com o cabeçalho e as listas de seleção.
6. **Implantar → Nova implantação → tipo "App da Web"**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa** (obrigatório para usar pela Vercel)
7. Copie a URL que termina em `/exec`.

Pronto: **essa URL já é o app** funcionando, gravando na planilha.
Dá para usar só assim, sem Vercel. Também dá para editar direto na planilha;
o app enxerga as linhas novas.

> Sempre que alterar o código, faça **Implantar → Gerenciar implantações →
> Editar → Nova versão**, senão a URL continua com a versão antiga.

## 2. (Opcional) Publicar na Vercel com endereço próprio

1. No `index.html`, cole a URL `/exec` em `const API_URL = '...'`.
2. Suba esta pasta para um repositório no GitHub.
3. Em <https://vercel.com/new>, importe o repositório. Framework: **Other**,
   sem build. Clique em **Deploy**. (Plano Hobby é grátis.)

Sem `API_URL` o app abre em **modo de teste**, guardando os dados só no
navegador — útil para experimentar antes de configurar a planilha.

## Segurança

Com acesso "Qualquer pessoa", quem tiver o link consegue editar. Para exigir
uma senha, preencha `CHAVE_DE_ACESSO` no `Code.gs` e reimplante; o app pede a
chave uma vez e lembra dela no navegador. Se todos usam Google Workspace da
empresa, prefira "Qualquer pessoa da organização" na implantação.
