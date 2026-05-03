// ══════════════════════════════════════════════════════════════
// ЕДИНЫЙ СЛОЙ РАБОТЫ С LOCAL STORAGE
// Все операции чтения/записи только через этот сервис
// ══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  PROFILE: 'ld_pf_v3',
  SECTIONS: 'ld_sec_v3',
  TASKS: 'ld_tasks_v3',
  JOURNAL: 'ld_journal_v3',
  SHOP_LIST: 'ld_shop_v3',
  PET_LOG: 'ld_petlog_v3',
  TRIPS: 'ld_trips_v3',
  HOBBIES: 'ld_hobbies_v3',
  REPORTS: 'ld_reports_v2',
  REPORT_GROUPS: 'ld_report_groups',
  WEEK_MENU: 'ld_week_menu',
  WHEEL_SCORES: 'ld_wheel',
  MENTAL_MOOD: 'mental_mood',
  MENTAL_STRESS: 'mental_stress',
  MENTAL_LOG: 'mental_log',
  AI_NOTES: 'ld_ai_notes',
  AI_JOURNAL: 'ld_ai_journal',
  FEED_TIMES: 'ld_feed_times',
  COMMUTE_SETTINGS: 'ld_commute_settings',
  WORK_TOOLS: 'ld_work_tools',
  BEAUTY_TOPICS: 'ld_beauty_topics',
  BEAUTY_PROCS: 'ld_beauty_procs',
  CUSTOM_PRACTICES: 'custom_practices',
  PUSH_SUBSCRIBED: 'push_subscribed',
};

class StorageService {
  
  // ─── Базовые операции ───
  
  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Storage: ошибка чтения ${key}`, error);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Storage: ошибка записи ${key}`, error);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Storage: ошибка удаления ${key}`, error);
      return false;
    }
  }

  // ─── ПРОФИЛЬ ───
  
  static getProfile() {
    return this.get(STORAGE_KEYS.PROFILE);
  }

  static setProfile(profile) {
    return this.set(STORAGE_KEYS.PROFILE, profile);
  }

  // ─── ЗАДАЧИ ───
  
  static getTasks() {
    return this.get(STORAGE_KEYS.TASKS, []);
  }

  static setTasks(tasks) {
    return this.set(STORAGE_KEYS.TASKS, tasks);
  }

  // Добавить одну задачу
  static addTask(task) {
    const tasks = this.getTasks();
    tasks.push(task);
    return this.setTasks(tasks);
  }

  // Обновить задачу
  static updateTask(taskId, updates) {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      return this.setTasks(tasks);
    }
    return false;
  }

  // Удалить задачу
  static removeTask(taskId) {
    const tasks = this.getTasks().filter(t => t.id !== taskId);
    return this.setTasks(tasks);
  }

  // ─── ЖУРНАЛ ───
  
  static getJournal() {
    return this.get(STORAGE_KEYS.JOURNAL, {});
  }

  static getJournalEntry(date) {
    const journal = this.getJournal();
    return journal[date] || {};
  }

  static setJournalEntry(date, entry) {
    const journal = this.getJournal();
    journal[date] = { ...(journal[date] || {}), ...entry };
    return this.set(STORAGE_KEYS.JOURNAL, journal);
  }

  // ─── СПИСОК ПОКУПОК ───
  
  static getShopList() {
    return this.get(STORAGE_KEYS.SHOP_LIST, []);
  }

  static setShopList(list) {
    return this.set(STORAGE_KEYS.SHOP_LIST, list);
  }

  static addShopItem(item) {
    const list = this.getShopList();
    list.push(item);
    return this.setShopList(list);
  }

  static toggleShopItem(itemId) {
    const list = this.getShopList().map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    return this.setShopList(list);
  }

  // ─── РАЗДЕЛЫ ───
  
  static getSections() {
    return this.get(STORAGE_KEYS.SECTIONS);
  }

  static setSections(sections) {
    return this.set(STORAGE_KEYS.SECTIONS, sections);
  }

  // ─── ПИТОМЦЫ ───
  
  static getPetLog() {
    return this.get(STORAGE_KEYS.PET_LOG, {});
  }

  static setPetFeed(date, petId, feeds) {
    const log = this.getPetLog();
    if (!log[date]) log[date] = {};
    log[date][petId] = feeds;
    return this.set(STORAGE_KEYS.PET_LOG, log);
  }

  // ─── ПОЕЗДКИ ───
  
  static getTrips() {
    return this.get(STORAGE_KEYS.TRIPS, []);
  }

  static setTrips(trips) {
    return this.set(STORAGE_KEYS.TRIPS, trips);
  }

  // ─── ХОББИ ───
  
  static getHobbies() {
    return this.get(STORAGE_KEYS.HOBBIES, []);
  }

  static setHobbies(hobbies) {
    return this.set(STORAGE_KEYS.HOBBIES, hobbies);
  }

  // ─── ОТЧЁТЫ ───
  
  static getReports() {
    return this.get(STORAGE_KEYS.REPORTS, []);
  }

  static setReports(reports) {
    return this.set(STORAGE_KEYS.REPORTS, reports);
  }

  static getReportGroups() {
    return this.get(STORAGE_KEYS.REPORT_GROUPS, []);
  }

  static setReportGroups(groups) {
    return this.set(STORAGE_KEYS.REPORT_GROUPS, groups);
  }

  // ─── AI КЭШ ───
  
  static getAICache(key) {
    try {
      const cached = localStorage.getItem(key);
      if (cached) return cached;
    } catch {}
    return null;
  }

  static setAICache(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  // ─── УВЕДОМЛЕНИЯ ───
  
  static getPushNotified(dateStr) {
    return this.get(`push_notified_${dateStr}`, {});
  }

  static setPushNotified(dateStr, data) {
    return this.set(`push_notified_${dateStr}`, data);
  }

  // ─── ВСПОМОГАТЕЛЬНЫЕ ───
  
  // Получить все данные (для экспорта/бекапа)
  static getAllData() {
    const data = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      data[key] = this.get(key);
    });
    return data;
  }

  // Очистить все данные приложения (осторожно!)
  static clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.remove(key);
    });
  }
}

export { StorageService, STORAGE_KEYS };
export default StorageService;
