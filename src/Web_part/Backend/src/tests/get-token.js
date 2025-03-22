// src/tests/get-token.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Определение пути к корневой директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Загрузка переменных окружения
dotenv.config({ path: path.join(rootDir, '.env') });

// Проверка наличия переменных окружения
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env file');
  console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('SUPA')));
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Using service role key');

async function getToken() {
  try {
    // Создание клиента Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Получение всех пользователей для поиска администратора
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', 'admin')
      .limit(1);
    
    if (usersError) {
      console.error('Error fetching admin users:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.error('No admin users found in the database');
      return;
    }
    
    const adminUser = users[0];
    console.log(`Found admin user: ${adminUser.full_name} (${adminUser.auth_user_id})`);
    
    // Создание JWT токена для админа с использованием сервисного ключа
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: 'admin@trackflow.com' // Обновите на реальный email админа, если нужно
    });
    
    if (error) {
      console.error('Error generating token:', error);
      return;
    }
    
    console.log('\n--- ADMIN JWT TOKEN ---');
    console.log(data.properties.access_token);
    console.log('------------------------\n');
    
    // Как альтернатива, просто используйте сервисный ключ для тестов
    console.log('For testing purposes, you can also use the service role key as a bearer token:');
    console.log(supabaseKey);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

getToken();