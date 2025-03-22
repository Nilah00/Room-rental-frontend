const { io } = require('socket.io-client');

let socket;

const initializeSocket = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found, cannot initialize socket');
    return;
  }

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  
  // Close existing socket if it exists
  if (socket) {
    socket.close();
  }
  
  // Create new socket connection with auth token
  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Socket event handlers
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Listen for new notifications
  socket.on('notification', (notification) => {
    console.log('New notification received:', notification);
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('newNotification', { 
      detail: notification 
    }));
    
    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('RoomRental Notification', {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  });

  // Listen for booking updates
  socket.on('booking_update', (booking) => {
    console.log('Booking update received:', booking);
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new CustomEvent('bookingUpdate', { 
      detail: booking 
    }));
  });

  return socket;
};

const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    console.log('Socket disconnected manually');
  }
};

const getSocket = () => {
  return socket;
};

const emitEvent = (event, data) => {
  if (socket) {
    socket.emit(event, data);
  } else {
    console.error('Socket not initialized');
  }
};

module.exports = {
  initializeSocket,
  disconnectSocket,
  getSocket,
  emitEvent
};