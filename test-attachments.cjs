#!/usr/bin/env node

/**
 * Скрипт для тестирования работы с attachments проектов
 * Использование: node test-attachments.js
 */

const fs = require('fs');
const path = require('path');

// Читаем конфигурацию из .env.local
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
    console.error('❌ Файл .env.local не найден');
    process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const DIRECTUS_URL = envContent.match(/VITE_DIRECTUS_URL=(.+)/)?.[1]?.trim();
const DIRECTUS_TOKEN = envContent.match(/VITE_DIRECTUS_(?:STATIC_)?TOKEN=(.+)/)?.[1]?.trim();

if (!DIRECTUS_URL || !DIRECTUS_TOKEN) {
    console.error('❌ DIRECTUS_URL или DIRECTUS_TOKEN не найдены в .env.local');
    process.exit(1);
}

console.log('🔍 Проверка подключения к Directus...');
console.log(`📍 URL: ${DIRECTUS_URL}`);

async function testAttachments() {
    try {
        // 1. Получаем список проектов
        console.log('\n1️⃣ Получение списка проектов...');
        const projectsResponse = await fetch(
            `${DIRECTUS_URL}/items/projects?fields=id,name,attachments.*&deep[attachments][_fields]=id,projects_id,directus_files_id.*,url,title`,
            {
                headers: {
                    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!projectsResponse.ok) {
            throw new Error(`HTTP ${projectsResponse.status}: ${await projectsResponse.text()}`);
        }

        const projectsData = await projectsResponse.json();
        const projects = projectsData.data;

        console.log(`✅ Найдено проектов: ${projects.length}`);
        
        // Показываем пример данных первого проекта с attachments
        const projectWithAttachments = projects.find(p => p.attachments && p.attachments.length > 0);
        if (projectWithAttachments) {
            console.log('\n📋 Пример данных attachment:');
            console.log(JSON.stringify(projectWithAttachments.attachments[0], null, 2));
        }

        // 2. Анализируем attachments
        console.log('\n2️⃣ Анализ attachments...');
        let totalAttachments = 0;
        let fileAttachments = 0;
        let linkAttachments = 0;
        let invalidAttachments = 0;

        projects.forEach(project => {
            const attachments = project.attachments || [];
            totalAttachments += attachments.length;

            attachments.forEach(att => {
                if (att.directus_files_id) {
                    fileAttachments++;
                    // Проверяем, что directus_files_id - это объект с данными
                    if (typeof att.directus_files_id === 'string') {
                        console.warn(`⚠️  Проект "${project.name}": directus_files_id - строка, а не объект`);
                        invalidAttachments++;
                    } else if (!att.directus_files_id.id) {
                        console.warn(`⚠️  Проект "${project.name}": directus_files_id не содержит id`);
                        invalidAttachments++;
                    }
                } else if (att.url) {
                    linkAttachments++;
                } else {
                    console.warn(`⚠️  Проект "${project.name}": attachment без файла и ссылки`);
                    invalidAttachments++;
                }
            });

            if (attachments.length > 0) {
                console.log(`   📎 ${project.name}: ${attachments.length} вложений`);
            }
        });

        console.log(`\n📊 Статистика:`);
        console.log(`   Всего attachments: ${totalAttachments}`);
        console.log(`   Файлов: ${fileAttachments}`);
        console.log(`   Ссылок: ${linkAttachments}`);
        console.log(`   Невалидных: ${invalidAttachments}`);

        // 3. Проверяем junction table
        console.log('\n3️⃣ Проверка junction table...');
        const junctionResponse = await fetch(
            `${DIRECTUS_URL}/items/projects_files?fields=*`,
            {
                headers: {
                    'Authorization': `Bearer ${DIRECTUS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (junctionResponse.ok) {
            const junctionData = await junctionResponse.json();
            console.log(`✅ Записей в projects_files: ${junctionData.data.length}`);
            
            // Проверяем на дубликаты
            const fileIds = new Map();
            junctionData.data.forEach(record => {
                const key = `${record.projects_id}-${record.directus_files_id}`;
                if (fileIds.has(key)) {
                    console.warn(`⚠️  Дубликат: проект ${record.projects_id}, файл ${record.directus_files_id}`);
                }
                fileIds.set(key, record.id);
            });
        } else {
            console.warn('⚠️  Не удалось получить данные из projects_files');
        }

        // 4. Итоговый результат
        console.log('\n' + '='.repeat(50));
        if (invalidAttachments === 0) {
            console.log('✅ Все attachments валидны!');
        } else {
            console.log(`⚠️  Найдено ${invalidAttachments} проблемных attachments`);
            console.log('💡 Рекомендация: проверьте код загрузки файлов');
        }

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        process.exit(1);
    }
}

testAttachments();
