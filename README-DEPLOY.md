# Guia de Deploy - Finance ERP

## 📋 Pré-requisitos para Deploy

### 1. Variáveis de Ambiente Obrigatórias

Configure as seguintes variáveis no painel da Vercel:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=production
```

### 2. Estrutura do Projeto

- **Frontend**: React Native Web (FinanceERP/)
- **Backend**: Node.js/Express API (backend/)
- **Database**: Supabase PostgreSQL
- **Deploy**: Vercel (frontend + serverless functions)

### 3. Configuração da Vercel

O projeto está configurado para deploy unificado:
- Frontend servido como site estático
- Backend como serverless functions em `/api/*`
- Roteamento automático configurado no `vercel.json`

### 4. Passos para Deploy

1. **Conectar repositório à Vercel**
2. **Configurar variáveis de ambiente** no painel da Vercel
3. **Deploy automático** será executado

### 5. URLs após Deploy

- **Frontend**: `https://your-project.vercel.app`
- **API**: `https://your-project.vercel.app/api/*`
- **Health Check**: `https://your-project.vercel.app/api/health`

### 6. Validação Pós-Deploy

- [ ] Frontend carrega corretamente
- [ ] API responde em `/api/health`
- [ ] Conexão com Supabase funcional
- [ ] Autenticação funcionando

## 🔧 Troubleshooting

### Erro de Conexão Supabase
- Verificar se as variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão corretas
- Confirmar se o projeto Supabase está ativo

### Erro 404 nas Rotas da API
- Verificar se o `vercel.json` está na raiz do projeto
- Confirmar se as rotas estão configuradas corretamente

### Frontend não carrega
- Verificar se o build do frontend foi bem-sucedido
- Confirmar se o `dist/` foi gerado corretamente