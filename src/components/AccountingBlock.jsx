// src/components/AccountingBlock.jsx
import { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { KGD_REPORTS, BNS_REPORTS } from '../data/kz-reports';
import { calculateNextDeadline } from '../store/AppContext';
import { T } from '../utils/theme';

export function AccountingBlock() {
  const { accountingReports, setAccountingReports, notify } = useApp();
  
  // View: 'catalog' | 'active'
  const [view, setView] = useState('active');
  
  // Состояния для сворачивания списков
  const [kgdOpen, setKgdOpen] = useState(false);
  const [bnsOpen, setBnsOpen] = useState(false);
  
  // Состояние для создания своей формы
  const [customModal, setCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ 
    name: '', 
    frequency: 'monthly', 
    deadline: '', 
    type: 'custom' 
  });

  // Фильтрация: какие отчеты уже выбраны
  const selectedIds = useMemo(() => 
    new Set(accountingReports.map(r => r.id)), 
    [accountingReports]
  );

  const toggleReport = (report, catalog) => {
    if (selectedIds.has(report.id)) {
      // Удалить отчет
      setAccountingReports(accountingReports.filter(r => r.id !== report.id));
      notify('Отчет удален из списка');
    } else {
      // Добавить отчет с авто-расчетом первого дедлайна
      const firstDeadline = calculateNextDeadline(report.frequency, new Date().toISOString().split('T')[0]);
      const newReport = {
        ...report,
        catalog, // 'kgd' | 'bns' | 'custom'
        nextDeadline: firstDeadline,
        status: 'pending',
        addedAt: new Date().toISOString()
      };
      setAccountingReports([...accountingReports, newReport]);
      notify('Отчет добавлен ✦');
    }
  };

  const addCustomReport = () => {
    if (!customForm.name || !customForm.deadline) {
      notify('Заполните название и срок');
      return;
    }
    const firstDeadline = calculateNextDeadline(customForm.frequency, new Date().toISOString().split('T')[0]);
    const newReport = {
      ...customForm,
      id: `custom-${Date.now()}`,
      code: '—',
      catalog: 'custom',
      nextDeadline: firstDeadline,
      status: 'pending',
      addedAt: new Date().toISOString()
    };
    
    setAccountingReports([...accountingReports, newReport]);
    notify('Отчет добавлен ✦');
    setCustomModal(false);
    setCustomForm({ name: '', frequency: 'monthly', deadline: '', type: 'custom' });
  };

  const deleteReport = (id) => {
    setAccountingReports(accountingReports.filter(r => r.id !== id));
    notify('Отчет удален');
  };

  const toggleStatus = (id) => {
    setAccountingReports(accountingReports.map
