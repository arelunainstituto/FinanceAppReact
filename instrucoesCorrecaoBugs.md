### 🧩 Diagnóstico e Correção Definitiva: Falha recorrente no login após deploys na Vercel

#### 🎯 Objetivo
Reinicializar completamente o driver do projeto e diagnosticar a causa da falha recorrente do **login** após cada novo deploy na Vercel.  
O sistema deve identificar por que a **comunicação entre frontend e backend** se perde, corrigir o comportamento de URLs variáveis e configurar um **domínio fixo** para estabilidade permanente.

---

### 🧠 Contexto do problema

1. Estrutura atual:
   - **Frontend:** React Native Web  
   - **Backend:** Node.js (API com rotas de autenticação e outras funcionalidades)  
   - **Banco:** Supabase (PostgreSQL com autenticação via API Key)  
   - **Deploy:** Vercel com MCP ativo (frontend + backend integrados)

2. Situação observada:
   - O login **funciona em alguns momentos** após deploys iniciais.  
   - Após ajustes de rotas ou novos deploys, o **login quebra novamente**.  
   - Cada novo deploy da Vercel gera **URLs temporárias (`*.vercel.app`)**, e o frontend passa a chamar o backend errado.  
   - O problema **reaparece mesmo após correções anteriores**.  
   - O TRAE entra em um **loop de correção infinita**, sempre refazendo as rotas e quebrando novamente.

---

### 🧩 Sintomas

- Falha na rota de **login** (erro de autenticação, CORS, ou 404).  
- Frontend perde referência do backend após novo deploy.  
- `baseURL` da API muda a cada build.  
- Deploys parecem retroceder o estado do projeto (rollback).  
- Correções anteriores desaparecem a cada nova versão.

---

### 🧠 Instruções para o TRAE AI

#### 1. Reinicialização completa
- Zerar o driver e todas as correções anteriores.  
- Ignorar qualquer cache ou rollback de versões anteriores.  
- Fazer uma **análise limpa e completa** da estrutura atual do repositório e dos logs de deploy.

---

#### 2. Diagnóstico do erro
- Identificar **por que o login quebra após cada deploy**.  
- Investigar se o problema está em:
  - URLs temporárias de preview (`vercel.app`)
  - Variáveis de ambiente inconsistentes
  - Configuração incorreta de `baseURL` no frontend
  - Falhas na sincronização de rotas `/api`
  - Rebuilds automáticos sem persistência de configurações

- Gerar logs comparativos entre:
  - O deploy em que o login funcionou  
  - O deploy subsequente onde o login falhou  

---

#### 3. Verificar configuração atual do backend
- Determinar se o backend está implementado como:
  - Subpasta `/api` (funções serverless)  
  - Projeto Node.js separado  
- Garantir que todas as rotas (login, registro, dados) estejam mapeadas corretamente.  
- Validar se o Supabase responde normalmente via API Key.

---

#### 4. Padronizar variáveis de ambiente
- Confirmar e persistir as seguintes variáveis na Vercel (sem alteração entre builds):
  - `NEXT_PUBLIC_API_BASE_URL`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - (opcional) `SUPABASE_SERVICE_ROLE_KEY`
  - `NODE_ENV=production`
- Assegurar que o frontend use **sempre o mesmo endpoint fixo** via `NEXT_PUBLIC_API_BASE_URL`.

---

#### 5. Corrigir baseURL e comunicação front ↔ back
- Reescrever a lógica de comunicação do frontend (Axios / Fetch) para que o endpoint da API seja obtido apenas via variável de ambiente.
- Testar a requisição de login (POST /login) e as rotas protegidas.
- Garantir que o backend responda **no mesmo domínio** do frontend ou em subdomínio estável (para evitar CORS).

---

#### 6. 🚀 Configurar domínio fixo
- Configurar um **Custom Domain** na Vercel (ex: `app.suaempresa.com`).
- Vincular **tanto o frontend quanto o backend** a esse domínio.
- Atualizar a variável `NEXT_PUBLIC_API_BASE_URL` para apontar para o domínio fixo (ex: `https://app.suaempresa.com/api`).
- Validar:
  - Certificado SSL ativo  
  - Redirecionamentos automáticos HTTP → HTTPS  
  - Persistência do domínio após novos deploys  
- Garantir que novos deploys **não alterem o endpoint da API**.

---

#### 7. Testes automatizados
- Executar testes de integração:
  - `POST /login` — deve retornar token válido.  
  - `GET /profile` — deve retornar dados autenticados.  
  - Testar logout, rotas protegidas e fluxo completo.
- Realizar **novo deploy de teste** e confirmar que:
  - O login continua funcional.
  - A URL da API não foi alterada.
  - Nenhuma variável foi sobrescrita.
- Registrar logs detalhados de sucesso e falha.

---

#### 8. Gerar relatório final
O relatório final deve incluir:
- Causa raiz do problema.  
- Etapas aplicadas para estabilizar o login.  
- Confirmação da persistência do domínio fixo.  
- Logs de testes antes e depois da correção.  
- Confirmação de que o bug não reaparece após novo deploy.

---

### ⚙️ Contexto técnico
- **Frontend:** React Native Web  
- **Backend:** Node.js (Express, Next.js API ou Fastify)  
- **Banco:** Supabase (PostgreSQL via API Key)  
- **Deploy:** Vercel com MCP ativo  
- **Problema:** Falhas recorrentes no login por URLs variáveis e rollback de rotas  
- **Solução:** URL fixa, domínio customizado, variáveis persistentes e validação pós-deploy

---

### ✅ Resultado esperado
- Login e rotas estáveis em todos os deploys.  
- URL do backend fixa (domínio customizado).  
- Nenhum rollback automático após novos builds.  
- Comunicação frontend ↔ backend persistente.  
- Ambiente confiável para futuras atualizações e integrações.
