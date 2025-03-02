"use client"

import { useState, useEffect } from "react"
import { Bell } from 'lucide-react'
import { initializeApp } from "firebase/app"
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore"
import { getMessaging, getToken, onMessage } from "firebase/messaging"

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


let app;
let db;
let messaging;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  
  // Only initialize messaging if we're in a browser environment that supports it
  if (typeof window !== 'undefined' && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (!db) {
      console.error('Firestore is not initialized');
      return;
    }

    const userId = "current-user-id" // Replace with actual user ID logic

    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("timestamp", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setNotifications(newNotifications)
      setUnreadCount(newNotifications.filter((n) => !n.read).length)
    })

    if (messaging) {
      getToken(messaging).then((token) => {
        if (token) {
          updateDoc(doc(db, "users", userId), { fcmToken: token })
        }
      }).catch((error) => {
        console.error('Error getting messaging token:', error);
      });

      const messageHandler = onMessage(messaging, (payload) => {
        const notification = {
          id: Date.now().toString(),
          message: payload.notification?.body || "",
          read: false,
          timestamp: new Date(),
        }
        setNotifications((prev) => [notification, ...prev])
        setUnreadCount((prev) => prev + 1)
      })

      return () => {
        unsubscribe()
        if (messageHandler) messageHandler()
      }
    } else {
      return () => {
        unsubscribe()
      }
    }
  }, [])

  const markAsRead = (notificationId) => {
    if (db) {
      updateDoc(doc(db, "notifications", notificationId), { read: true })
    }
  }

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
    if (!showNotifications) {
      setUnreadCount(0)
      notifications.forEach((n) => {
        if (!n.read) markAsRead(n.id)
      })
    }
  }

  return (
    <div className="notification-system">
      <button onClick={toggleNotifications} className="notification-icon">
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>
      {showNotifications && (
        <div className="notification-dropdown">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div key={notification.id} className={`notification-item ${!notification.read ? "unread" : ""}`}>
                <p>{notification.message}</p>
                <small>{notification.timestamp.toDate().toLocaleString()}</small>
              </div>
            ))
          ) : (
            <p>No notifications</p>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationSystem
