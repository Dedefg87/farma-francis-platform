#!/usr/bin/env node

/**
 * Script para verificar números duplicados no sistema Farma Francis
 * 
 * Verifica:
 * 1. Duplicatas na tabela customers (por phone)
 * 2. Duplicatas na received_messages (provider + externalId)
 * 3. Duplicatas na conversation_messages (provider + externalId)
 * 4. Contatos sem normalização (com/sem 9º dígito)
 */

import pkg from 'mysql2/promise';
import * as dotenv from 'dotenv';

const { createClient } = pkg;

// Carregar variáveis de ambiente
dotenv.config();

async function getConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
  }
  
  // Parse da URL do banco (formato: mysql://user:pass@host:port/database)
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/(.+)/);
  if (!match) {
    throw new Error('Formato DATABASE_URL inválido');
  }
  
  const [, username, password, host, port, database] = match;
  
  return await createClient({
    host,
    port: port ? parseInt(port) : 3306,
    user: username,
    password,
    database,
    connectTimeout: 10000,
  });
}

async function checkDuplicateCustomers(conn) {
  console.log('\n=== VERIFICANDO DUPLICATAS EM CUSTOMERS ===\n');
  
  try {
    const [rows] = await conn.execute(`
      SELECT phone, COUNT(*) as count, GROUP_CONCAT(id) as ids, GROUP_CONCAT(name) as names
      FROM customers
      WHERE phone IS NOT NULL
      GROUP BY phone
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);
    
    if (rows.length === 0) {
      console.log('✅ Nenhum customer com telefone duplicado encontrado.');
      return 0;
    } else {
      console.log(`⚠️  Encontrados ${rows.length} telefones duplicados:\n`);
      let totalDuplicates = 0;
      
      for (const row of rows) {
        totalDuplicates += row.count - 1;
        console.log(`📱 Telefone: ${row.phone}`);
        console.log(`   Contagem: ${row.count} customers`);
        console.log(`   IDs: ${row.ids}`);
        console.log(`   Nomes: ${row.names}`);
        console.log('');
      }
      
      console.log(`📊 Total de registros duplicados: ${totalDuplicates}`);
      return totalDuplicates;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas de customers:', error.message);
    return -1;
  }
}

async function checkDuplicateReceivedMessages(conn) {
  console.log('\n=== VERIFICANDO DUPLICATAS EM received_messages ===\n');
  
  try {
    const [rows] = await conn.execute(`
      SELECT provider, external_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM received_messages
      GROUP BY provider, external_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);
    
    if (rows.length === 0) {
      console.log('✅ Nenhuma mensagem recebida duplicada (provider+externalId) encontrada.');
      return 0;
    } else {
      console.log(`⚠️  Encontrados ${rows.length} combinações provider+externalId duplicadas:\n`);
      let totalDuplicates = 0;
      
      for (const row of rows) {
        totalDuplicates += row.count - 1;
        console.log(`🔢 Provider: ${row.provider}, ExternalId: ${row.external_id}`);
        console.log(`   Contagem: ${row.count} mensagens`);
        console.log(`   IDs: ${row.ids}`);
        console.log('');
      }
      
      console.log(`📊 Total de registros duplicados: ${totalDuplicates}`);
      return totalDuplicates;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas de received_messages:', error.message);
    return -1;
  }
}

async function checkDuplicateConversationMessages(conn) {
  console.log('\n=== VERIFICANDO DUPLICATAS EM conversation_messages ===\n');
  
  try {
    const [rows] = await conn.execute(`
      SELECT provider, external_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
      FROM conversation_messages
      WHERE provider IS NOT NULL AND external_id IS NOT NULL
      GROUP BY provider, external_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);
    
    if (rows.length === 0) {
      console.log('✅ Nenhuma mensagem de conversa duplicada (provider+externalId) encontrada.');
      return 0;
    } else {
      console.log(`⚠️  Encontrados ${rows.length} combinações provider+externalId duplicadas:\n`);
      let totalDuplicates = 0;
      
      for (const row of rows) {
        totalDuplicates += row.count - 1;
        console.log(`🔢 Provider: ${row.provider}, ExternalId: ${row.external_id}`);
        console.log(`   Contagem: ${row.count} mensagens`);
        console.log(`   IDs: ${row.ids}`);
        console.log('');
      }
      
      console.log(`📊 Total de registros duplicados: ${totalDuplicates}`);
      return totalDuplicates;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas de conversation_messages:', error.message);
    return -1;
  }
}

async function checkPhoneFormatVariations(conn) {
  console.log('\n=== VERIFICANDO VARIAÇÕES DE FORMATO DE TELEFONE ===\n');
  
  try {
    // Buscar customers com números que podem ter variações (com/sem 9º dígito)
    const [rows] = await conn.execute(`
      SELECT 
        SUBSTRING(REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', ''), -8) as last8,
        COUNT(*) as count,
        GROUP_CONCAT(DISTINCT phone) as phones,
        GROUP_CONCAT(DISTINCT id) as ids
      FROM customers
      WHERE phone REGEXP '^[0-9]{10,12}$'
      GROUP BY last8
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 20
    `);
    
    if (rows.length === 0) {
      console.log('✅ Nenhuma variação de formato de telefone encontrada.');
      return 0;
    } else {
      console.log(`⚠️  Encontrados ${rows.length} grupos com possíveis variações:\n`);
      let totalVariations = 0;
      
      for (const row of rows) {
        totalVariations += row.count - 1;
        console.log(`🔢 Últimos 8 dígitos: ${row.last8}`);
        console.log(`   Contagem: ${row.count} customers`);
        console.log(`   Telefones: ${row.phones}`);
        console.log(`   IDs: ${row.ids}`);
        console.log('');
      }
      
      console.log(`📊 Total de customers com variações: ${totalVariations}`);
      return totalVariations;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar variações de telefone:', error.message);
    return -1;
  }
}

async function checkIndexes(conn) {
  console.log('\n=== VERIFICANDO ÍNDICES DE UNICIDADE ===\n');
  
  try {
    // Verificar se os índices únicos existem
    const [rows] = await conn.execute(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.TABLE_NAME,
        kcu.COLUMN_NAME
      FROM 
        information_schema.TABLE_CONSTRAINTS tc
        JOIN information_schema.KEY_COLUMN_USAGE kcu 
          ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      WHERE 
        tc.CONSTRAINT_TYPE = 'UNIQUE'
        AND tc.TABLE_SCHEMA = DATABASE()
        AND tc.TABLE_NAME IN ('customers', 'received_messages', 'conversation_messages')
      ORDER BY tc.TABLE_NAME, kcu.ORDINAL_POSITION
    `);
    
    if (rows.length === 0) {
      console.log('⚠️  Nenhum índice único encontrado nas tabelas monitoradas.');
      return false;
    } else {
      console.log('✅ Índices únicos encontrados:\n');
      for (const row of rows) {
        console.log(`   ${row.TABLE_NAME}.${row.COLUMN_NAME} → ${row.CONSTRAINT_NAME}`);
      }
      console.log('');
      return true;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar índices:', error.message);
    return false;
  }
}

async function getStats(conn) {
  console.log('\n=== ESTATÍSTICAS DO BANCO ===\n');
  
  try {
    const [customerCount] = await conn.execute('SELECT COUNT(*) as total FROM customers');
    const [receivedCount] = await conn.execute('SELECT COUNT(*) as total FROM received_messages');
    const [conversationCount] = await conn.execute('SELECT COUNT(*) as total FROM conversations');
    const [messageCount] = await conn.execute('SELECT COUNT(*) as total FROM conversation_messages');
    
    console.log(`📊 Totais atuais:`);
    console.log(`   Customers: ${customerCount[0].total}`);
    console.log(`   Received Messages: ${receivedCount[0].total}`);
    console.log(`   Conversations: ${conversationCount[0].total}`);
    console.log(`   Conversation Messages: ${messageCount[0].total}`);
    console.log('');
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error.message);
  }
}

async function main() {
  console.log('🔍 INICIANDO VERIFICAÇÃO DE DUPLICATAS');
  console.log('📊 Sistema: Farma Francis Platform');
  console.log(`⏰ Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
  
  let conn;
  let totalIssues = 0;
  
  try {
    conn = await getConnection();
    console.log('✅ Conectado ao banco de dados MySQL\n');
    
    await getStats(conn);
    
    const dupCustomers = await checkDuplicateCustomers(conn);
    const dupReceived = await checkDuplicateReceivedMessages(conn);
    const dupConversations = await checkDuplicateConversationMessages(conn);
    const phoneVariations = await checkPhoneFormatVariations(conn);
    const indexesExist = await checkIndexes(conn);
    
    totalIssues = (dupCustomers > 0 ? dupCustomers : 0) + 
                  (dupReceived > 0 ? dupReceived : 0) + 
                  (dupConversations > 0 ? dupConversations : 0) + 
                  (phoneVariations > 0 ? phoneVariations : 0);
    
    console.log('\n========================================');
    console.log('📋 RESUMO DA VERIFICAÇÃO');
    console.log('========================================');
    console.log(`📌 Duplicatas em customers: ${dupCustomers}`);
    console.log(`📌 Duplicatas em received_messages: ${dupReceived}`);
    console.log(`📌 Duplicatas em conversation_messages: ${dupConversations}`);
    console.log(`📌 Variações de formato de telefone: ${phoneVariations}`);
    console.log(`📌 Índices únicos configurados: ${indexesExist ? 'Sim' : 'Não'}`);
    console.log(`\n📊 Total de problemas encontrados: ${totalIssues}`);
    
    if (totalIssues === 0 && indexesExist) {
      console.log('\n✅ SISTEMA SEM DUPLICATAS - TODOS OS ÍNDICES PRESENTES');
    } else if (totalIssues > 0) {
      console.log('\n⚠️  ATENÇÃO: Duplicatas encontradas!');
      console.log('   Recomendação: Executar script de limpeza ou corrigir normalização.');
    } else if (!indexesExist) {
      console.log('\n⚠️  ATENÇÃO: Não há índices únicos configurados.');
      console.log('   Recomendação: Criar índices para prevenir futuras duplicatas.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
  } finally {
    if (conn) {
      await conn.end();
      console.log('\n🔌 Conexão com banco encerrada');
    }
  }
  
  console.log('\n✅ VERIFICAÇÃO CONCLUÍDA\n');
}

main();
