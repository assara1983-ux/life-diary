// src/store/AppContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

// Вспомогательный хук для синхронизации с localStorage
// Он читает данные при старте и записывает их при изменении
function useStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Ошибка сохранения ${key}:`, e);
    }
  }, [key, value]);

  return [value, setValue];
}

export function AppProvider({ children }) {
  // --- Основные данные (Ключи сохранены от старой версии для миграции) ---
  const [profile, setProfile] = useStorageState('ld_pf_v3', null);
  
  // Список разделов меню
  const [sections, setSections] = useStorageState('ld_sec_v3', [
    { id: "today", emoji: "☀️", name: "Сегодня", vis: true },
    { id: "schedule", emoji: "🗓️", name: "Расписание", vis: true },
    { id: "work", emoji: "💼", name: "Работа", vis: true },
    { id: "home", emoji: "🏡", name: "Дом", vis: true },
    { id: "shopping", emoji: "🛒", name: "Покупки", vis: true },
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

  // --- Работа и Отчетность ---
  const [reportGroups, setReportGroups] = useStorageState('ld_report_groups', []);
  const [reports, setReports] = useStorageState('ld_reports_v2', []);
  const [workTools, setWorkTools] = useStorageState('ld_work_tools', []);
  const [checkResults, setCheckResults] = useStorageState('ld_deadline_checks', {});

  // --- Цели и Трекеры ---
  const [goalsTools, setGoalsTools] = useStorageState('ld_goals_tools', {
    weightLog: [], 
    habits: [], 
    calories: { goal: 0, log: [] }, 
    workout: null, 
    workoutSetup: null
  });
  const [wheelScores, setWheelScores] = useStorageState('ld_wheel', {});

  // --- Здоровье, Красота и Быт ---
  const [weekMenu, setWeekMenu] = useStorageState('ld_week_menu', null);
  const [beautyProcs, setBeautyProcs] = useStorageState('ld_beauty_procs', {});
  const [beautyTopics, setBeautyTopics] = useStorageState('ld_beauty_topics', []);
  const [feedTimes, setFeedTimes] = useStorageState('ld_feed_times', {});
  const [commuteSettings, setCommuteSettings] = useStorageState('ld_commute_settings', {});

  // --- Ментальное здоровье ---
  const [mentalMood, setMentalMood] = useStorageState('mental_mood', 3);
  const [mentalStress, setMentalStress] = useStorageState('mental_stress', 5);
  const [mentalLog, setMentalLog] = useStorageState('mental_log', []);
  const [mentalRecoveryPlan, setMentalRecoveryPlan] = useStorageState('mental_recovery_plan', '');
  const [customPractices, setCustomPractices] = useStorageState('custom_practices', []);

  // --- AI Заметки и Журнал ---
  const [aiNotes, setAiNotes] = useStorageState('ld_ai_notes', []);
  const [aiJournal, setAiJournal] = useStorageState('ld_ai_journal', []);

  // --- UI Состояния (Свернутые/Развернутые блоки) ---
  // Сохраняем состояние интерфейса из старой версии
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

  // Собираем всё в один объект для удобного доступа
  const value = {
    // Основные данные
    profile, setProfile,
    sections, setSections,
    tasks, setTasks,
    journal, setJournal,
    shopList, setShopList,
    petLog, setPetLog,
    trips, setTrips,
    hobbies, setHobbies,
    // Работа
    reportGroups, setReportGroups,
    reports, setReports,
    workTools, setWorkTools,
    checkResults, setCheckResults,
    // Цели
    goalsTools, setGoalsTools,
    wheelScores, setWheelScores,
    // Здоровье/Красота/Быт
    weekMenu, setWeekMenu,    beautyProcs, setBeautyProcs,
    beautyTopics, setBeautyTopics,
    feedTimes, setFeedTimes,
    commuteSettings, setCommuteSettings,
    // Ментальное
    mentalMood, setMentalMood,
    mentalStress, setMentalStress,
    mentalLog, setMentalLog,
    mentalRecoveryPlan, setMentalRecoveryPlan,
    customPractices, setCustomPractices,
    // AI
    aiNotes, setAiNotes,
    aiJournal, setAiJournal,
    // UI Состояния
    workOpenWeek, setWorkOpenWeek,
    workOpenUpcoming, setWorkOpenUpcoming,
    workOpenGroups, setWorkOpenGroups,
    workOpenTasks, setWorkOpenTasks,
    workOpenAdvice, setWorkOpenAdvice,
    shopAdvice, setShopAdvice,
    shopListOpen, setShopListOpen,
    petsAdvice, setPetsAdvice,
    petsFeed, setPetsFeed,
    petsCare, setPetsCare,
    homeAdvice, setHomeAdvice,
    homeTasks, setHomeTasks,
    hobbyAdvice, setHobbyAdvice,
    hobbyList, setHobbyList,
    travelAdvice, setTravelAdvice,
    travelTrips, setTravelTrips,
    journalPrompts, setJournalPrompts,
    journalHistory, setJournalHistory,
    carAdvice, setCarAdvice,
    carTasks, setCarTasks,
    beautyProcsOpen, setBeautyProcsOpen,
    beautyTodayOpen, setBeautyTodayOpen,
    beautyChooseOpen, setBeautyChooseOpen,
    healthAdvice, setHealthAdvice,
    healthHabits, setHealthHabits,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
