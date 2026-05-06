// src/utils/pushManager.js

// Вспомогательная функция для преобразования ключа в нужный формат
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const API_URL = '/api/send-push'; // Относительный путь для Vercel

/**
 * Запрашивает разрешение у пользователя
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('Этот браузер не поддерживает уведомления');
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Подписывает пользователя на пуш-уведомления и сохраняет подписку
 */
export async function subscribeUser() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Проверяем, есть ли уже подписка
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Создаем новую подписку
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Сохраняем подписку в localStorage, чтобы использовать её для отправки
    localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    
    console.log('User subscribed:', subscription);
    return subscription;
  } catch (error) {
    console.error('Failed to subscribe:', error);
    return null;
  }
}

/**
 * Отправляет пуш-уведомление через наш API
 */
export async function sendPush(title, body, tag = 'reminder') {
  const subscriptionJson = localStorage.getItem('pushSubscription');
  if (!subscriptionJson) {
    console.warn('Нет активной подписки для отправки пуша');
    return;
  }

  try {
    const subscription = JSON.parse(subscriptionJson);
    
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        title,
        body,
        tag
      })
    });
    
    console.log('Push notification sent');
  } catch (error) {
    console.error('Error sending push:', error);
  }
}
