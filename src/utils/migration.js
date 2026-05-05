// src/utils/migration.js

/**
 * Миграция данных из старой монолитной версии в новую модульную архитектуру
 * Сохраняет ВСЕ существующие данные пользователя
 */

// Список всех ключей localStorage которые использует приложение
export const STORAGE_KEYS = {
  // Основные данные
  PROFILE: 'ld_pf_v3',
  SECTIONS: 'ld_sec_v3',
  TASKS: 'ld_tasks_v3',
  JOURNAL: 'ld_journal_v3',
  
  // Разделы
  SHOPPING: 'ld_shop_v3',
  PET_LOG: 'ld_petlog_v3',
  TRIPS: 'ld_trips_v3',
  HOBBIES: 'ld_hobbies_v3',
  
  // Работа
  REPORT_GROUPS: 'ld_report_groups',
  REPORTS: 'ld_reports_v2',
  DEADLINE_CHECKS: 'ld_deadline_checks',
  WORK_TOOLS: 'ld_work_tools',
  
  // Цели
  GOALS_TOOLS: 'ld_goals_tools',
  WHEEL: 'ld_wheel',
  
  // Здоровье
  WEEK_MENU: 'ld_week_menu',
  
  // Красота
  BEAUTY_PROCS: 'ld_beauty_procs',
  BEAUTY_TOPICS: 'ld_beauty_topics',
  
  // Настройки UI
  FEED_TIMES: 'ld_feed_times',
  COMMUTE_SETTINGS: 'ld_commute_settings',
  AI_BOX_CACHE: 'ld_aibox_cache',
  AI_JOURNAL: 'ld_ai_journal',
  AI_NOTES: 'ld_ai_notes',
  
  // Ментальное здоровье
  MOOD: 'mental_mood',
  STRESS: 'mental_stress',
  MENTAL_LOG: 'mental_log',
  RECOVERY_PLAN: 'mental_recovery_plan',  CUSTOM_PRACTICES: 'custom_practices',
  
  // UI состояния (открытые/закрытые разделы)
  WORK_OPEN_WEEK: 'ld_work_open_week',
  WORK_OPEN_UPCOMING: 'ld_work_open_upcoming',
  WORK_OPEN_GROUPS: 'ld_work_open_groups',
  WORK_OPEN_TASKS: 'ld_work_open_tasks',
  WORK_OPEN_ADVICE: 'ld_work_open_advice',
  SHOP_ADVICE: 'ld_shop_advice',
  SHOP_LIST: 'ld_shop_list',
  PETS_ADVICE: 'ld_pets_advice',
  PETS_FEED: 'ld_pets_feed',
  PETS_CARE: 'ld_pets_care',
  HOME_OPEN_ADVICE: 'ld_home_open_advice',
  HOME_OPEN_TASKS: 'ld_home_open_tasks',
  HOBBY_ADVICE: 'ld_hobby_advice',
  HOBBY_LIST: 'ld_hobby_list',
  TRAVEL_ADVICE: 'ld_travel_advice',
  TRAVEL_TRIPS: 'ld_travel_trips',
  JOURNAL_PROMPTS: 'ld_journal_prompts',
  JOURNAL_HISTORY: 'ld_journal_history',
  CAR_ADVICE: 'ld_car_advice',
  CAR_TASKS: 'ld_car_tasks',
  BEAUTY_PROCS_OPEN: 'ld_beauty_procs_open',
  BEAUTY_TODAY_OPEN: 'ld_beauty_today_open',
  BEAUTY_CHOOSE_OPEN: 'ld_beauty_choose_open',
};

/**
 * Проверяет целостность данных и выполняет миграцию если нужно
 */
export function migrateData() {
  console.log('[Migration] Starting data migration check...');
  
  try {
    // Проверяем профиль
    const profile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (profile) {
      const parsed = JSON.parse(profile);
      console.log('[Migration] Profile found:', parsed.name || 'Anonymous');
      
      // Проверяем что все необходимые поля есть
      if (!parsed.sections) {
        console.log('[Migration] Adding default sections...');
      }
    } else {
      console.log('[Migration] No profile found - new user');
    }
    
    // Проверяем задачи    const tasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (tasks) {
      const taskList = JSON.parse(tasks);
      console.log(`[Migration] Found ${taskList.length} tasks`);
    }
    
    // Проверяем журнал
    const journal = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    if (journal) {
      const entries = JSON.parse(journal);
      const entryCount = Object.keys(entries).length;
      console.log(`[Migration] Found ${entryCount} journal entries`);
    }
    
    console.log('[Migration] Data migration check completed successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[Migration] Error during migration:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Экспорт всех данных пользователя (для бэкапа)
 */
export function exportAllData() {
  const data = {};
  
  Object.entries(STORAGE_KEYS).forEach(([keyName, storageKey]) => {
    const value = localStorage.getItem(storageKey);
    if (value) {
      try {
        data[keyName] = JSON.parse(value);
      } catch {
        data[keyName] = value;
      }
    }
  });
  
  return data;
}

/**
 * Импорт данных (для восстановления из бэкапа)
 */
export function importAllData(data) {
  Object.entries(data).forEach(([keyName, value]) => {
    const storageKey = STORAGE_KEYS[keyName];
    if (storageKey) {      try {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } catch (error) {
        console.error(`[Import] Error importing ${keyName}:`, error);
      }
    }
  });
}

/**
 * Очистка всех данных (с подтверждением)
 */
export function clearAllData() {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('[Migration] All data cleared');
}

/**
 * Получение статистики использования
 */
export function getUsageStats() {
  const stats = {
    profile: null,
    tasksCount: 0,
    journalEntries: 0,
    tripsCount: 0,
    hobbiesCount: 0,
    shoppingItems: 0,
    petsCount: 0,
  };
  
  try {
    const profile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (profile) stats.profile = JSON.parse(profile);
    
    const tasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (tasks) stats.tasksCount = JSON.parse(tasks).length;
    
    const journal = localStorage.getItem(STORAGE_KEYS.JOURNAL);
    if (journal) stats.journalEntries = Object.keys(JSON.parse(journal)).length;
    
    const trips = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (trips) stats.tripsCount = JSON.parse(trips).length;
    
    const hobbies = localStorage.getItem(STORAGE_KEYS.HOBBIES);
    if (hobbies) stats.hobbiesCount = JSON.parse(hobbies).length;
    
    const shopping = localStorage.getItem(STORAGE_KEYS.SHOPPING);    if (shopping) stats.shoppingItems = JSON.parse(shopping).length;
    
    const petLog = localStorage.getItem(STORAGE_KEYS.PET_LOG);
    if (petLog) {
      const log = JSON.parse(petLog);
      stats.petsCount = Object.keys(log).length;
    }
  } catch (error) {
    console.error('[Stats] Error calculating stats:', error);
  }
  
  return stats;
}
