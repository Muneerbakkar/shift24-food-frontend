import { useState } from 'react';
import { Bell, Package, Tag, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Order Confirmed!',
      message: 'Your order #12345 has been confirmed and is being prepared.',
      time: '2 hours ago',
      type: 'order',
      unread: true,
    },
    {
      id: '2',
      title: 'New Menu Items Added',
      message: 'Check out our new summer salads and refreshing drinks.',
      time: '1 day ago',
      type: 'promo',
      unread: true,
    },
    {
      id: '3',
      title: 'Delivery Successful',
      message: 'Your order was successfully delivered. Enjoy your meal!',
      time: '3 days ago',
      type: 'success',
      unread: false,
    }
  ]);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order': return <Package className="w-6 h-6 text-blue-500" />;
      case 'promo': return <Tag className="w-6 h-6 text-purple-500" />;
      case 'success': return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
      default: return <Bell className="w-6 h-6 text-slate-500" />;
    }
  };

  return (
    <div className="pt-8 md:pt-16 lg:pt-24 pb-12 lg:pb-24 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-slate-500 text-sm font-medium mb-1">
              <Link to="/" className="hover:text-emerald-600 transition-colors">Home</Link> <span className="mx-2">/</span> 
              <span className="text-slate-900">Notifications</span>
            </p>
            <h1 className="text-3xl font-bold text-slate-900">Notifications</h1>
          </div>
          {notifications.some(n => n.unread) && (
            <button 
              onClick={markAllAsRead}
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-12 text-center border border-slate-100 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No notifications yet</h3>
              <p className="text-slate-500">When you get updates about your orders or account, they'll show up here.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                onClick={() => markAsRead(notification.id)}
                className={`bg-white p-6 rounded-2xl shadow-sm border cursor-pointer transition-all ${notification.unread ? 'border-emerald-200 bg-emerald-50/10 hover:bg-emerald-50/20' : 'border-slate-100 hover:border-slate-200'}`}
              >
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notification.unread ? 'bg-white shadow-sm' : 'bg-slate-50'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold text-base ${notification.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap ml-4">
                        {notification.time}
                      </span>
                    </div>
                    <p className={`text-sm ${notification.unread ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                      {notification.message}
                    </p>
                  </div>
                  {notification.unread && (
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
