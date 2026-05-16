// src/hooks/useHealthProfile.js
import { useMemo } from 'react';
import { getProfileInsights, getCurrentSeason, getMoonDay, getCurrentMeridian } from '../utils/knowledgeEngine';
import { getChronotypePeaks, getBreathingPractice, getInfoVortex, getEnergyLevel } from '../data/profileKnowledge';

export function useHealthProfile(profile) {
  return useMemo(() => {
    if (!profile) return {};

    const insights = getProfileInsights(profile) || {};
    const season = getCurrentSeason();
    const moonDay = getMoonDay();
    const currentMeridian = getCurrentMeridian();
    const chrono = getChronotypePeaks(profile.chronotype);
    const energy = getEnergyLevel(profile.sleepQuality, profile.chronotype);
    const vortex = getInfoVortex(profile);
    const breathing = getBreathingPractice(season.replace(/[^\w\s]/g, '').trim()) || { 
      practice: 'Сам Чон До', 
      technique: 'Вдох носом 3с → Выдох ртом 6с', 
      avoid: 'Не направлять дыхание в область ❤️ и 🧠' 
    };

    // Фаза Цзяцзы (упрощённый расчёт по возрасту)
    const age = profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 0;
    const jiaziPhase = age % 60 <= 20 ? 'Рождение / Купание' : 
                       age % 60 <= 40 ? 'Расцвет / Старение' : 
                       'Зачатие / Созревание';
    const jiaziAdvice = jiaziPhase.includes('Рождение') ? 'Инициируйте новые практики. Не бойтесь ошибок.' :
                        jiaziPhase.includes('Расцвет') ? 'Пик эффективности. Укрепляйте базу.' :
                        'Накопление опыта. Подготовьтесь к следующему циклу.';

    return {
      chrono,
      energyLevel: energy.level,
      lifeCycle: insights.lifeCycle,
      jiaziPhase,
      jiaziAdvice,
      commPattern: vortex.tk || 'Универсальный',
      breathing,
      season,
      moonDay,
      currentMeridian,
      profile
    };
  }, [profile]);
}
