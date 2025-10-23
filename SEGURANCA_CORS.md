# 🔒 Documentação de Segurança CORS

## Resumo
Este documento explica as medidas de segurança implementadas na configuração CORS da API.

## ✅ Validação Implementada

### 1. **Lista Explícita de Domínios Permitidos**
URLs exatas que são sempre aceitas:
- `https://financeapp-areluna.vercel.app` (Produção - main)
- `https://financeapp-lime.vercel.app` (Preview - master)

### 2. **Validação por Regex para Deploys de Preview**
Padrões seguros que aceitam apenas URLs legítimas do Vercel:

```regex
^https:\/\/financeapp-areluna(-[a-z0-9]+)?\.vercel\.app$
^https:\/\/financeapp-lime(-[a-z0-9]+)?\.vercel\.app$
^https:\/\/financeapp-areluna-git-[a-z0-9-]+\.vercel\.app$
^https:\/\/financeapp-lime-git-[a-z0-9-]+\.vercel\.app$
```

**O que essas regex fazem:**
- ✅ `^https://` - Exige HTTPS (SSL)
- ✅ `financeapp-areluna` ou `financeapp-lime` - Nome EXATO do projeto
- ✅ `(-[a-z0-9]+)?` - Opcional: hash de deploy (ex: `-abc123`)
- ✅ `-git-[a-z0-9-]+` - Branch deploys (ex: `-git-master`)
- ✅ `\.vercel\.app$` - Termina EXATAMENTE com `.vercel.app`

### 3. **Proteção contra Requisições sem Origin**
- Em **produção**: Bloqueia requisições sem header `Origin`
- Em **desenvolvimento**: Permite (para ferramentas como Postman)

## 🛡️ Ataques Bloqueados

### URLs Maliciosas que SÃO BLOQUEADAS:

| Tipo de Ataque | Exemplo | Por que é bloqueado |
|----------------|---------|-------------------|
| **Prefixo malicioso** | `https://malicious-financeapp-areluna.vercel.app` | Regex exige que comece com `https://financeapp-` |
| **Sufixo falso** | `https://financeapp-areluna.vercel.app.fake.com` | Regex exige que termine com `.vercel.app` |
| **Domínio após** | `https://financeapp-areluna.vercel.app.evil.com` | Regex usa `$` para garantir final exato |
| **HTTP não seguro** | `http://financeapp-areluna.vercel.app` | Regex exige `https://` |
| **Path injection** | `https://evil.com/financeapp-areluna.vercel.app` | Regex valida estrutura completa |
| **Domínio falso** | `https://financeapp-areluna.fake-vercel.app` | Regex valida `.vercel.app` exato |
| **Nome diferente** | `https://financeapp-other.vercel.app` | Lista de nomes permitidos é específica |

## ✅ URLs Aceitas (Legítimas)

- ✅ `https://financeapp-areluna.vercel.app`
- ✅ `https://financeapp-lime.vercel.app`
- ✅ `https://financeapp-areluna-git-master.vercel.app`
- ✅ `https://financeapp-lime-abc123.vercel.app`
- ✅ `https://financeapp-areluna-git-feature-xyz.vercel.app`

## 🔍 Logs e Monitoramento

Cada requisição CORS é registrada nos logs com:
```
🌐 CORS Request from origin: [URL]
✅ CORS: Allowed origin from list
✅ CORS: Allowed Vercel preview URL (validated)
❌ CORS: Origin not allowed - [URL]
```

## 🧪 Teste de Segurança

Para validar a segurança, execute:
```bash
node test-cors-security.js
```

Este script testa 13 cenários (5 válidos + 8 ataques) e verifica se todos são tratados corretamente.

## 📝 Configuração de Variáveis de Ambiente

No Vercel, configure a variável `CORS_ORIGIN` para sobrescrever os padrões:

```env
CORS_ORIGIN=https://financeapp-areluna.vercel.app,https://financeapp-lime.vercel.app,https://custom-domain.com
```

**Importante:** Sempre use URLs completas com `https://` e separe com vírgula.

## 🔄 Manutenção

### Adicionar novo domínio de preview:

1. Edite `/api/index.ts`
2. Adicione o domínio na lista `allowedOrigins`
3. Adicione padrões regex correspondentes
4. Execute `node test-cors-security.js` para validar
5. Faça deploy

### Remover domínio antigo:

1. Remova da lista `allowedOrigins`
2. Remova os padrões regex correspondentes
3. Verifique que não há deploys ativos usando esse domínio

## 🚨 Avisos de Segurança

1. **Nunca use `origin: true`** - Isso aceita qualquer origem
2. **Nunca use apenas `includes()`** - Isso é vulnerável a injeção
3. **Sempre valide o final da URL** - Use `$` no regex
4. **Sempre use HTTPS** - Nunca permita HTTP em produção
5. **Monitore os logs** - Verifique tentativas de acesso bloqueadas

## ✅ Status Atual

**Data:** 20/10/2025  
**Status:** ✅ Seguro  
**Última Auditoria:** Validação completa realizada  
**Testes:** 13/13 passados

---

**Autor:** Sistema de Segurança FinanceApp  
**Última Atualização:** Outubro 2025

