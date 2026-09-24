# Guia de GitHub e Publicação — Comunidade Jogatina

Este guia parte do projeto pronto em `comunidade-jogatina`. Ele utiliza o caminho mais seguro para esta versão: **GitHub para versionamento** e **WebDev/Manus para a hospedagem gerenciada**, porque autenticação, banco de dados e arquivos EPUB já estão ligados a essa infraestrutura. Assim, não é necessário expor chaves nem recriar o banco.

> **Importante:** os EPUBs enviados ficam no armazenamento do portal e não entram no GitHub. O repositório guarda somente código, migrações e documentação.

## 1. Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new).
2. Informe o nome `comunidade-jogatina`.
3. Escolha **Private** se as regras do grupo, dados de membros ou desenvolvimento não devem ser públicos.
4. Não marque **Add a README**, **.gitignore** ou **license**, pois o projeto já possui esses arquivos.
5. Clique em **Create repository**.
6. Copie a URL HTTPS mostrada pelo GitHub. Ela terá este formato:

```text
https://github.com/SEU_USUARIO/comunidade-jogatina.git
```

## 2. Enviar o projeto ao GitHub

Abra um terminal dentro da pasta do projeto. Troque apenas `SEU_USUARIO` no comando abaixo e cole o bloco inteiro:

```bash
cd comunidade-jogatina

git status
git add .
git commit -m "feat: portal inicial da Comunidade Jogatina"
git branch -M main

git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/SEU_USUARIO/comunidade-jogatina.git
git push -u origin main
```

Na primeira vez, o GitHub pode pedir autenticação. Para HTTPS, use o navegador ou um **Personal Access Token** do GitHub no lugar de senha; o GitHub não aceita mais senha comum por terminal.

### Atualizações futuras

Sempre que alterar o portal, use este bloco:

```bash
cd comunidade-jogatina

git add .
git commit -m "descreva a alteração aqui"
git push
```

Para conferir se tudo foi salvo antes de enviar:

```bash
git status
git log --oneline -5
```

## 3. Publicar na hospedagem gerenciada

Esta versão é um aplicativo fullstack: usa **MySQL/TiDB**, autenticação Manus e armazenamento privado de arquivos. Por isso, o caminho recomendado é publicar no próprio projeto WebDev, onde essas três integrações já estão configuradas.

1. Abra o projeto **Comunidade Jogatina** no ambiente WebDev/Manus.
2. Confira o preview e entre com a conta de administradora.
3. Crie ou selecione o checkpoint mais recente do projeto.
4. Use a ação **Publish / Publicar** do projeto.
5. Abra a URL de produção fornecida e valide:
   - tela inicial;
   - login;
   - criação de um jogo;
   - uma avaliação; e
   - download de um EPUB de teste.
6. Se desejar domínio próprio, use a opção **Domains / Domínios** do projeto e siga a instrução de DNS apresentada pela plataforma.

> A URL de preview de desenvolvimento é temporária. Use a URL emitida pelo fluxo **Publish** como endereço oficial do grupo.

## 4. Publicação em provedor externo (opcional)

GitHub pode guardar o código em qualquer caso. Porém, hospedar este projeto em Vercel, Render, Railway ou outro provedor exige configurar equivalentes externos para os serviços gerenciados que já existem aqui: banco MySQL, OAuth e armazenamento de arquivos. Sem isso, o site abre, mas login, dados e EPUBs não funcionarão.

Se for necessário sair da hospedagem gerenciada, prepare antes estes itens:

| Item | Necessário para | Decisão necessária |
|---|---|---|
| MySQL compatível | jogos, livros, avaliações, comentários, links e auditoria | Criar banco e fornecer `DATABASE_URL` |
| Serviço de autenticação | login e hierarquia de membros | Escolher, por exemplo, Clerk, Auth0 ou Supabase Auth |
| Armazenamento S3 compatível | capas e EPUBs | Criar bucket privado e chaves de acesso |
| Variáveis de ambiente | conexão segura entre servidor e serviços | Cadastrar segredos no provedor, nunca no GitHub |
| Domínio e DNS | endereço público definitivo | Escolher o domínio do grupo |

Depois de configurar os equivalentes, o comando de build do projeto é:

```bash
pnpm install --frozen-lockfile
pnpm build
```

E o comando para iniciar o servidor é:

```bash
pnpm start
```

A migração do banco deve ser aplicada antes do primeiro acesso. Esta etapa precisa ser revisada junto do provedor escolhido, pois o banco inicial e as variáveis de autenticação precisam existir antes de rodar a aplicação. Não copie segredos para arquivos versionados.

## 5. Configurar a hierarquia do grupo

O primeiro dono do projeto é **Administrador**. Após cada pessoa criar sua conta e entrar pelo menos uma vez:

1. Abra **Administração** no menu.
2. Localize a pessoa em **Membros e permissões**.
3. Escolha um nível:

| Nível | Pode fazer |
|---|---|
| **Membro** | Ver o portal, adicionar avaliações e publicar comentários em jogos e livros. |
| **Editor** | Tudo de Membro, mais iniciar/encerrar lives, criar jogos, livros, EPUBs e links. |
| **Admin** | Tudo de Editor, mais promover ou rebaixar pessoas e consultar a trilha de alterações. |

A página de Administração registra criação de conteúdo, encerramento de live e alteração de níveis de acesso.

## 6. Operação rápida do dia a dia

### Colocar uma live no ar

1. Entre como **Editor** ou **Admin**.
2. Abra **Lives** e clique em **Iniciar live**.
3. Informe título, pessoa, plataforma e link.
4. Para uma dupla de transmissões, informe o mesmo texto no campo **Grupo de layout** nas duas lives.
5. Ao encerrar, use o ícone `×` na própria transmissão.

### Adicionar jogo ou livro

1. Entre como **Editor** ou **Admin**.
2. Abra **Jogos** ou **Livros**.
3. Clique em **Adicionar**.
4. Salve os dados básicos. A URL da capa e a nota externa são opcionais.
5. Membros podem abrir a ficha e usar **Incluir nota** ou **Comentar**.

### Subir EPUB

1. Entre como **Editor** ou **Admin**.
2. Abra **EPUB** e clique em **Adicionar EPUB**.
3. Escolha **Enviar arquivo** para um arquivo local de até 10 MB, ou **Usar link** para um arquivo hospedado externamente.
4. Preencha título e autor. A nota é opcional.

## 7. Checklist antes de divulgar

- [ ] O repositório está privado ou a decisão de deixá-lo público foi consciente.
- [ ] O primeiro administrador foi confirmado na página **Administração**.
- [ ] Há pelo menos um Editor além do administrador para evitar depender de uma pessoa só.
- [ ] A URL publicada, e não a de preview, foi testada em celular e computador.
- [ ] Um teste de criação de jogo, comentário e EPUB foi feito.
- [ ] Nenhum arquivo `.env`, token, senha ou chave foi enviado ao GitHub.

## 8. Conectar GitHub e Vercel ao agente (opcional)

Nesta sessão, os conectores de **GitHub** e **Vercel** não estão ativados. Se preferir que futuras alterações sejam enviadas e publicadas com assistência direta, ative esses conectores nas configurações do Manus e conecte a conta desejada. Isso é opcional: os comandos das seções 1 e 2 funcionam sem conector.
