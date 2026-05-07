// src/store/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { STORAGE_KEYS } from '../utils/migration';
// ИМПОРТ КАТАЛОГОВ
import { KGD_CATALOG, BNS_CATALOG } from '../data/reportsCatalog';

const AppContext = createContext(null);

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
export function calculateNextDeadline(frequency, lastDeadline = new Date().toISOString().split('T')[0]) {
  const date = new Date(lastDeadline);
  switch (frequency) {
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'semiannual': date.setMonth(date.getMonth() + 6); break;
    case 'annual': date.setFullYear(date.getFullYear() + 1); break;
    default: return null;
  }
  return date.toISOString().split('T')[0];
}

export function daysUntilDeadline(deadline) {
  if (!deadline) return Infinity;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline); dl.setHours(0, 0, 0, 0);
  return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
}

function useStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch { return defaultValue; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error(`Ошибка сохранения ${key}:`, e); }
  }, [key, value]);
  return [value, setValue];
}

export function AppProvider({ children }) {
  // --- Основные данные ---
  const [profile, setProfile] = useStorageState('ld_pf_v3', null);
  const [sections, setSections] = useStorageState('ld_sec_v3', [
    { id: "today", emoji: "☀️", name: "Сегодня", vis: true },
    { id: "schedule", emoji: "🗓️", name: "Расписание", vis: true },
    { id: "work", emoji: "💼", name: "Работа", vis: true },
    { id: "home", emoji: "🏡", name: "Дом", vis: true },    { id: "shopping", emoji: "🛒", name: "Покупки", vis: true },
    { id: "pets", emoji: "🐾", name: "Питомцы", vis: true },
    { id: "car", emoji: "🚗", name: "Авто", vis: true },
    { id: "health", emoji: "🌿", name: "Здоровье", vis: true },
    { id: "beauty", emoji: "✨", name: "Уход", vis: true },
    { id: "hobbies", emoji: "🎨", name: "Хобби", vis: true },
    { id: "goals", emoji: "🎯", name: "Мои цели", vis: true },
    { id: "mental", emoji: "🧘", name: "Ментальное", vis: true },
    { id: "travel", emoji: "✈️", name: "Поездки", vis: true },
    { id: "journal", emoji: "📖", name: "Журнал", vis: true },
    { id: "profile", emoji: "👤", name: "Профиль", vis: true },
  ]);
  const [tasks, setTasks] = useStorageState('ld_tasks_v3', []);
  const [journal, setJournal] = useStorageState('ld_journal_v3', {});
  const [shopList, setShopList] = useStorageState('ld_shop_v3', []);
  const [petLog, setPetLog] = useStorageState('ld_petlog_v3', {});
  const [trips, setTrips] = useStorageState('ld_trips_v3', []);
  const [hobbies, setHobbies] = useStorageState('ld_hobbies_v3', []);

  // --- Работа и Отчетность (ОБНОВЛЕНО) ---
  const [reportGroups, setReportGroups] = useStorageState('ld_report_groups', []);
  const [reports, setReports] = useStorageState('ld_reports_v2', []);
  const [checkResults, setCheckResults] = useStorageState('ld_deadline_checks', {});
  const [accountingReports, setAccountingReports] = useStorageState('ld_accounting_reports', []);
  
  // ✅ Инструменты
  const [workTools, setWorkTools] = useStorageState('ld_work_tools', []);
  const addWorkTool = (toolData) => {
    setWorkTools(prev => [...prev, { id: 'tool-' + Date.now(), ...toolData, steps: toolData.steps || [], createdAt: new Date().toISOString() }]);
  };
  const deleteWorkTool = (toolId) => {
    setWorkTools(prev => prev.filter(t => t.id !== toolId));
  };

  // ✅ Пользовательские группы отчетов
  const [customReportGroups, setCustomReportGroups] = useStorageState('ld_custom_report_groups', []);
  const addCustomGroup = (name) => {
    setCustomReportGroups(prev => [...prev, { id: 'g-' + Date.now(), name, reports: [] }]);
  };
  const deleteGroup = (groupId) => {
    setCustomReportGroups(prev => prev.filter(g => g.id !== groupId));
  };
  const addCustomReport = (groupId, reportData) => {
    setCustomReportGroups(prev => prev.map(g => {
      if (g.id === groupId) return { ...g, reports: [...g.reports, { id: 'r-' + Date.now(), ...reportData }] };
      return g;
    }));
  };

  // ✅ Выбор отчетов из Каталога (КГД/БНС)  const [selectedReports, setSelectedReports] = useStorageState('ld_selected_reports', []);
  const toggleReport = (reportId) => {
    setSelectedReports(prev => prev.includes(reportId) ? prev.filter(id => id !== reportId) : [...prev, reportId]);
  };

  // ✅ Состояние сворачивания секций
  const [collapsedSections, setCollapsedSections] = useStorageState('ld_collapsed_sections', {});
  const toggleSection = (id) => {
    setCollapsedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- Ментальное здоровье и прочее ---
  const [mentalMood, setMentalMood] = useStorageState('mental_mood', 3);
  const [mentalStress, setMentalStress] = useStorageState('mental_stress', 5);
  const [mentalLog, setMentalLog] = useStorageState('mental_log', []);
  const [mentalRecoveryPlan, setMentalRecoveryPlan] = useStorageState('mental_recovery_plan', '');
  const [customPractices, setCustomPractices] = useStorageState('custom_practices', []);
  const [aiNotes, setAiNotes] = useStorageState('ld_ai_notes', []);
  const [aiJournal, setAiJournal] = useStorageState('ld_ai_journal', []);

  // --- UI Состояния ---
  const [workOpenWeek, setWorkOpenWeek] = useStorageState('ld_work_open_week', true);
  const [workOpenUpcoming, setWorkOpenUpcoming] = useStorageState('ld_work_open_upcoming', true); 
  const [workOpenGroups, setWorkOpenGroups] = useStorageState('ld_work_open_groups', true);
  const [workOpenTasks, setWorkOpenTasks] = useStorageState('ld_work_open_tasks', true);
  const [workOpenAdvice, setWorkOpenAdvice] = useStorageState('ld_work_open_advice', true);
  const [shopAdvice, setShopAdvice] = useStorageState('ld_shop_advice', true);
  const [shopListOpen, setShopListOpen] = useStorageState('ld_shop_list', true);
  const [petsAdvice, setPetsAdvice] = useStorageState('ld_pets_advice', true);
  const [petsFeed, setPetsFeed] = useStorageState('ld_pets_feed', true);
  const [petsCare, setPetsCare] = useStorageState('ld_pets_care', true);
  const [homeAdvice, setHomeAdvice] = useStorageState('ld_home_open_advice', true);
  const [homeTasks, setHomeTasks] = useStorageState('ld_home_open_tasks', true);
  const [hobbyAdvice, setHobbyAdvice] = useStorageState('ld_hobby_advice', true);
  const [hobbyList, setHobbyList] = useStorageState('ld_hobby_list', true);
  const [travelAdvice, setTravelAdvice] = useStorageState('ld_travel_advice', true);
  const [travelTrips, setTravelTrips] = useStorageState('ld_travel_trips', true);
  const [journalPrompts, setJournalPrompts] = useStorageState('ld_journal_prompts', true);
  const [journalHistory, setJournalHistory] = useStorageState('ld_journal_history', true);
  const [carAdvice, setCarAdvice] = useStorageState('ld_car_advice', true);
  const [carTasks, setCarTasks] = useStorageState('ld_car_tasks', true);
  const [beautyProcsOpen, setBeautyProcsOpen] = useStorageState('ld_beauty_procs_open', true);
  const [beautyTodayOpen, setBeautyTodayOpen] = useStorageState('ld_beauty_today_open', true);
  const [beautyChooseOpen, setBeautyChooseOpen] = useStorageState('ld_beauty_choose_open', true);
  const [healthAdvice, setHealthAdvice] = useStorageState('ld_health_advice', true);
  const [healthHabits, setHealthHabits] = useStorageState('ld_health_habits', true);

  // --- УМНАЯ СИНХРОНИЗАЦИЯ ЗАДАЧ (КАТАЛОГИ + СВОИ ОТЧЕТЫ) ---
  const allCatalogReports = useMemo(() => [...KGD_CATALOG, ...BNS_CATALOG], []);
  useEffect(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const warningDate = new Date(today); warningDate.setDate(today.getDate() + 7);
    const warningDateStr = warningDate.toISOString().split('T')[0];
    const newTasks = [];

    // 1. Отчеты из Каталога
    selectedReports.forEach(reportId => {
      const reportData = allCatalogReports.find(r => r.id === reportId);
      if (!reportData) return;
      reportData.deadlines2026.forEach(deadlineStr => {
        if (deadlineStr >= todayStr && deadlineStr <= warningDateStr) {
          const taskId = `report-task-${reportId}-${deadlineStr}`;
          if (!tasks.some(t => t.id === taskId)) {
            newTasks.push({ id: taskId, type: 'report', source: 'catalog', reportId, title: `📋 ${reportData.name}`, section: 'work', deadline: deadlineStr, priority: 'h', notes: `Срок: ${deadlineStr}`, doneDate: null, createdAt: new Date().toISOString() });
          }
        }
      });
    });

    // 2. Пользовательские отчеты
    customReportGroups.forEach(group => {
      group.reports.forEach(report => {
        if (report.deadline && report.deadline >= todayStr && report.deadline <= warningDateStr) {
           const taskId = `custom-task-${report.id}-${report.deadline}`;
           if (!tasks.some(t => t.id === taskId)) {
             newTasks.push({ id: taskId, type: 'report', source: 'custom', reportId: report.id, title: `📋 ${report.name}`, section: 'work', deadline: report.deadline, priority: 'h', notes: `Срок: ${report.deadline}`, doneDate: null, createdAt: new Date().toISOString() });
           }
        }
      });
    });

    if (newTasks.length > 0) setTasks(prev => [...prev, ...newTasks]);
  }, [selectedReports, customReportGroups, tasks, setTasks, allCatalogReports]);

  // --- Экспорт данных ---
  const value = {
    profile, setProfile, sections, setSections, tasks, setTasks,
    journal, setJournal, shopList, setShopList, petLog, setPetLog,
    trips, setTrips, hobbies, setHobbies,
    reportGroups, setReportGroups, reports, setReports,
    workTools, setWorkTools, addWorkTool, deleteWorkTool,
    checkResults, setCheckResults, accountingReports, setAccountingReports,
    customReportGroups, addCustomGroup, deleteGroup, addCustomReport,
    selectedReports, toggleReport,
    collapsedSections, toggleSection,
    goalsTools: useStorageState('ld_goals_tools', { weightLog: [], habits: [], calories: { goal: 0, log: [] }, workout: null, workoutSetup: null })[0],
    wheelScores: useStorageState('ld_wheel', {})[0],
    weekMenu: useStorageState('ld_week_menu', null)[0],    beautyProcs: useStorageState('ld_beauty_procs', {})[0],
    beautyTopics: useStorageState('ld_beauty_topics', [])[0],
    feedTimes: useStorageState('ld_feed_times', {})[0],
    commuteSettings: useStorageState('ld_commute_settings', {})[0],
    mentalMood, setMentalMood, mentalStress, setMentalStress, mentalLog, setMentalLog,
    mentalRecoveryPlan, setMentalRecoveryPlan, customPractices, setCustomPractices,
    aiNotes, setAiNotes, aiJournal, setAiJournal,
    workOpenWeek, setWorkOpenWeek, workOpenUpcoming, setWorkOpenUpcoming, workOpenGroups, setWorkOpenGroups,
    workOpenTasks, setWorkOpenTasks, workOpenAdvice, setWorkOpenAdvice,
    shopAdvice, setShopAdvice, shopListOpen, setShopListOpen,
    petsAdvice, setPetsAdvice, petsFeed, setPetsFeed, petsCare, setPetsCare,
    homeAdvice, setHomeAdvice, homeTasks, setHomeTasks,
    hobbyAdvice, setHobbyAdvice, hobbyList, setHobbyList,
    travelAdvice, setTravelAdvice, travelTrips, setTravelTrips,
    journalPrompts, setJournalPrompts, journalHistory, setJournalHistory,
    carAdvice, setCarAdvice, carTasks, setCarTasks,
    beautyProcsOpen, setBeautyProcsOpen, beautyTodayOpen, setBeautyTodayOpen,
    beautyChooseOpen, setBeautyChooseOpen, healthAdvice, setHealthAdvice, healthHabits, setHealthHabits,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
