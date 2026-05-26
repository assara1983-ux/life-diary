// src/utils/pushManager.js

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_URL = '/api/send-push';

// ─── Регистрация Service Worker ───
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    console.log('SW registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

// ─── Запрос разрешения ───
export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('Браузер не поддерживает уведомления');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// ─── Подписка пользователя ───
export async function subscribeUser() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker не поддерживается');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error('VITE_VAPID_PUBLIC_KEY не настроен');
    return null;
  }

  try {
    // ✅ Сначала регистрируем SW если ещё не зарегистрирован
    let registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) {
      registration = await registerServiceWorker();
    }
    if (!registration) return null;

    // Ждём активации SW
    await navigator.serviceWorker.ready;

    // Проверяем существующую подписку
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    console.log('Push subscription active:', subscription.endpoint);
    return subscription;
  } catch (error) {
    console.error('Push subscribe failed:', error);
    return null;
  }
}

// ─── Отправка push через сервер ───
export async function sendPush(title, body, tag = 'reminder') {
  const subscriptionJson = localStorage.getItem('pushSubscription');
  if (!subscriptionJson) {
    console.warn('Нет активной подписки');
    return false;
  }

  try {
    const subscription = JSON.parse(subscriptionJson);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, title, body, tag }),
    });

    const data = await res.json();
    if (!data.success) {
      console.warn('Push не отправлен:', data.message || data.error);
      // Если подписка устарела — чистим
      if (res.status === 410) {
        localStorage.removeItem('pushSubscription');
        console.warn('Подписка устарела, удалена');
      }
      return false;
    }

    console.log('Push отправлен:', title);
    return true;
  } catch (error) {
    console.error('Push send error:', error);
    return false;
  }
}

// ─── Отписка ───
export async function unsubscribeUser() {
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return false;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      localStorage.removeItem('pushSubscription');
      console.log('Отписка выполнена');
    }
    return true;
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return false;
  }
}

// ─── Проверка статуса подписки ───
export function getPushStatus() {
  if (!('Notification' in window)) return 'unsupported';
  if (!('serviceWorker' in navigator)) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}
