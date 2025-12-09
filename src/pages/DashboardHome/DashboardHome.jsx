import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, DollarSign, ShoppingCart, TrendingUp, Bell, Users, Package, Crown } from 'lucide-react';
import WebSocketManager from "@/lib/websocketManager";
import { dashboardAPI } from '@/api/dashboard.api';
import { useTranslation } from 'react-i18next';

const DashboardHome = () => {
  const { t } = useTranslation();
  
  // State cho KPI Cards
  const [kpi, setKpi] = useState({
    processingOrders: 0,
    todayRevenue: 0,
    topProducts: [],
    topCustomers: [],
    timestamp: null
  });

  // State cho Charts
  const [hourlyRevenue, setHourlyRevenue] = useState([]);
  const [orderStatusDist, setOrderStatusDist] = useState([]);

  // State cho Top Lists
  const [topProducts, setTopProducts] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);

  // State cho WebSocket
  const [wsStatus, setWsStatus] = useState(t('admin.dashboard.connecting'));
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);

  // Animation state cho KPI cards
  const [animatingKpi, setAnimatingKpi] = useState({});

  // Format số tiền USD
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Fetch initial data từ REST API
  const fetchInitialData = async () => {
    try {
      console.log('Fetching initial dashboard data...');
      const res = await dashboardAPI.getKpi();
      console.log('Initial KPI data:', res);
      
      setKpi(res);
      
      // Set initial top lists if available
      if (res.topProducts) {
        console.log('Setting initial top products:', res.topProducts);
        setTopProducts(res.topProducts);
      }
      if (res.topCustomers) {
        console.log('Setting initial top customers:', res.topCustomers);
        setTopCustomers(res.topCustomers);
      }

      // FIX: Manually trigger refresh để lấy chart data
      try {
        await dashboardAPI.refresh();
        console.log('Triggered dashboard refresh for chart data');
      } catch (refreshError) {
        console.warn('Failed to trigger refresh:', refreshError);
      }
    } catch (error) {
      console.error('Failed to fetch initial KPI:', error);
    }
  };
  
  // Handle KPI Update với animation
  const handleKpiUpdate = useCallback((payload) => {
  console.log('KPI Update received:', payload);
    setKpi(prev => {
      // Trigger animation nếu giá trị thay đổi
      if (prev.processingOrders !== payload.processingOrders) {
        setAnimatingKpi(a => ({ ...a, processingOrders: true }));
        setTimeout(() => setAnimatingKpi(a => ({ ...a, processingOrders: false })), 600);
      }
      if (prev.todayRevenue !== payload.todayRevenue) {
        setAnimatingKpi(a => ({ ...a, todayRevenue: true }));
        setTimeout(() => setAnimatingKpi(a => ({ ...a, todayRevenue: false })), 600);
      }
      return { ...prev, ...payload };
    });

    // Update top lists if included in payload
    if (payload.topProducts) {
      setTopProducts(payload.topProducts);
    }
    if (payload.topCustomers) {
      setTopCustomers(payload.topCustomers);
    }
  }, []);

  // Handle New Order với notification
  const handleNewOrder = useCallback((payload) => {
    const notification = {
      id: Date.now(),
      type: 'success',
      title: `🛒 ${t('admin.dashboard.newOrder')}`,
      message: `${payload.customerName} - ${formatCurrency(payload.total)}${payload.orderName ? ` — ${payload.orderName}` : payload.orderId ? ` — #${payload.orderId}` : ''}`,
      orderName: payload.orderName || (payload.orderId ? `#${payload.orderId}` : undefined),
      actor: 'Changeby Admin',
      time: new Date().toLocaleTimeString('vi-VN')
    };
    setNotifications(prev => [notification, ...prev].slice(0, 5));
  }, [t]);

  // Handle Order Status Changed
  const handleOrderStatusChanged = useCallback(async (payload) => {
    const statusMap = {
      PENDING: t('admin.dashboard.status.PENDING'),
      SHIPPING: t('admin.dashboard.status.SHIPPING'),
      WAIT_DELIVER: t('admin.dashboard.status.WAIT_DELIVER'),
      PAID: t('admin.dashboard.status.PAID'),
      CANCELED: t('admin.dashboard.status.CANCELED'),
      REFUND: t('admin.dashboard.status.REFUND')
    };
    
    const notification = {
      id: Date.now(),
      type: 'info',
      title: `📦 ${t('admin.dashboard.statusUpdate')}`,
      message: `${statusMap[payload.oldStatus] || payload.oldStatus} → ${statusMap[payload.newStatus] || payload.newStatus}`,
      orderName: payload.orderName || (payload.orderId ? `#${payload.orderId}` : undefined),
      actor: 'Changeby Admin',
      time: new Date().toLocaleTimeString('vi-VN')
    };
    setNotifications(prev => [notification, ...prev].slice(0, 5));
  }, [t]);

  // Handle Revenue Update
  const handleRevenueUpdate = useCallback((payload) => {
    setKpi(prev => ({ ...prev, todayRevenue: payload.todayRevenue }));
    setAnimatingKpi(a => ({ ...a, todayRevenue: true }));
    setTimeout(() => setAnimatingKpi(a => ({ ...a, todayRevenue: false })), 600);
  }, []);

  // Handle Top Products Update
  const handleTopProducts = useCallback((payload) => {
    console.log('Received TOP_PRODUCTS:', payload);
    setTopProducts(payload);
  }, []);

  // Handle Top Customers Update
  const handleTopCustomers = useCallback((payload) => {
    console.log('Received TOP_CUSTOMERS:', payload);
    setTopCustomers(payload);
  }, []);

  // Handle WebSocket message
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
  console.log('Received WebSocket message:', message.type, message.payload);

      switch (message.type) {
        case 'CONNECTION_SUCCESS':
          console.log('WebSocket connected:', message.payload);
          break;

        case 'KPI_UPDATE':
          handleKpiUpdate(message.payload);
          break;

        case 'NEW_ORDER':
          handleNewOrder(message.payload);
          break;

        case 'ORDER_STATUS_CHANGED':
          handleOrderStatusChanged(message.payload);
          break;

        case 'REVENUE_UPDATED':
          handleRevenueUpdate(message.payload);
          break;

        case 'HOURLY_REVENUE':
          console.log('Hourly revenue data:', message.payload);
          if (Array.isArray(message.payload) && message.payload.length > 0) {
            setHourlyRevenue(message.payload);
          } else {
            console.warn('Hourly revenue data is empty or invalid');
          }
          break;

        case 'ORDER_STATUS_DISTRIBUTION':
          console.log('Order status distribution:', message.payload);
          if (message.payload && typeof message.payload === 'object') {
            const distArray = Object.entries(message.payload).map(([status, count]) => ({
              status,
              count
            }));
            console.log('Converted distribution array:', distArray);
            if (distArray.length > 0) {
              setOrderStatusDist(distArray);
            } else {
              console.warn('Order status distribution is empty');
            }
          } else {
            console.warn('Invalid order status distribution payload');
          }
          break;

        case 'TOP_PRODUCTS':
          handleTopProducts(message.payload);
          break;

        case 'TOP_CUSTOMERS':
          handleTopCustomers(message.payload);
          break;

        default:
          console.log('Unknown event type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }, [handleKpiUpdate, handleNewOrder, handleOrderStatusChanged, handleRevenueUpdate, handleTopProducts, handleTopCustomers]);

  // Setup WebSocket với WebSocketManager
  useEffect(() => {
    console.log('Dashboard initializing...');
    
    // Fetch initial data
    fetchInitialData();

    const ws = new WebSocketManager(dashboardAPI.wsUrl(), {
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: Infinity
    });

    // Event handlers
    ws.on('open', () => {
      console.log('Connected to Dashboard WebSocket');
      setWsStatus(t('admin.dashboard.connected'));
    });

    ws.on('message', handleWebSocketMessage);

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      setWsStatus(t('admin.dashboard.connectionError'));
    });

    ws.on('close', () => {
      console.log('WebSocket closed');
      setWsStatus(t('admin.dashboard.disconnected'));
    });

    // Connect
    ws.connect();

    // Store ref
    wsRef.current = ws;

    // Cleanup
    return () => {
      console.log('Cleaning up dashboard...');
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleWebSocketMessage, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('admin.dashboard.title')}</h1>
            <p className="text-slate-600 mt-1">{t('admin.dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-slate-200">
            <div className={`w-2 h-2 rounded-full ${wsStatus === t('admin.dashboard.connected') ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-slate-700">{wsStatus}</span>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Đơn đang xử lý */}
          <Card className={`transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${animatingKpi.processingOrders ? 'ring-2 ring-blue-500 scale-105' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {t('admin.dashboard.processingOrders')}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{kpi.processingOrders}</div>
              <p className="text-xs text-slate-500 mt-1">{t('admin.dashboard.uncompletedOrders')}</p>
            </CardContent>
          </Card>

          {/* Doanh thu hôm nay */}
          <Card className={`transform transition-all duration-300 hover:scale-105 hover:shadow-lg ${animatingKpi.todayRevenue ? 'ring-2 ring-green-500 scale-105' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {t('admin.dashboard.todayRevenue')}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {formatCurrency(kpi.todayRevenue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('admin.dashboard.completedOrders')}</p>
            </CardContent>
          </Card>

          {/* Hoạt động */}
          <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {t('admin.dashboard.activity')}
              </CardTitle>
              <Activity className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {kpi.processingOrders > 0 ? '🟢 Live' : '⚪ Idle'}
              </div>
              <p className="text-xs text-slate-500 mt-1">{t('admin.dashboard.systemStatus')}</p>
            </CardContent>
          </Card>

          {/* Thông báo */}
          <Card className="transform transition-all duration-300 hover:scale-105 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {t('admin.dashboard.notifications')}
              </CardTitle>
              <Bell className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{notifications.length}</div>
              <p className="text-xs text-slate-500 mt-1">{t('admin.dashboard.newEvents')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Revenue Chart */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                {t('admin.dashboard.hourlyRevenue')}
              </CardTitle>
              <CardDescription>
                {t('admin.dashboard.hourlyRevenueDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hourlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hourlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(hour) => `${hour}h`}
                    />
                    <YAxis 
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(hour) => `${hour}:00`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                  <TrendingUp className="h-12 w-12 mb-3 text-slate-300" />
                  <p>{t('admin.dashboard.noRevenueData')}</p>
                  <p className="text-xs mt-1">{t('admin.dashboard.waitingForData')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                {t('admin.dashboard.orderStatusDistribution')}
              </CardTitle>
              <CardDescription>
                {t('admin.dashboard.orderStatusDistributionDesc')}
                {orderStatusDist.length > 0 && ` (${orderStatusDist.length} ${t('admin.dashboard.status').toLowerCase()})`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orderStatusDist.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={orderStatusDist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="status" 
                      stroke="#64748b"
                      fontSize={12}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#8b5cf6" 
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-500">
                  <ShoppingCart className="h-12 w-12 mb-3 text-slate-300" />
                  <p>{t('admin.dashboard.noStatusData')}</p>
                  <p className="text-xs mt-1">{t('admin.dashboard.waitingForData')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products & Top Customers Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-amber-600" />
                {t('admin.dashboard.topProducts')}
              </CardTitle>
              <CardDescription>{t('admin.dashboard.topProductsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div 
                      key={product.productId}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{product.productName}</p>
                          <p className="text-xs text-slate-500">ID: {product.productId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-amber-600">{product.quantity}</p>
                        <p className="text-xs text-slate-500">{t('admin.dashboard.sold')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  {t('admin.dashboard.noProductData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                {t('admin.dashboard.topCustomers')}
              </CardTitle>
              <CardDescription>{t('admin.dashboard.topCustomersDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomers.length > 0 ? (
                <div className="space-y-4">
                  {topCustomers.map((customer, index) => (
                    <div 
                      key={customer.customerId}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0 ? 'bg-purple-400 text-purple-900' :
                          index === 1 ? 'bg-pink-300 text-pink-900' :
                          index === 2 ? 'bg-indigo-300 text-indigo-900' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {index === 0 ? '👑' : index === 1 ? '⭐' : index === 2 ? '💎' : index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{customer.email}</p>
                          <p className="text-xs text-slate-500">ID: {customer.customerId}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(customer.total)}
                        </p>
                        <p className="text-xs text-slate-500">{t('admin.dashboard.totalSpent')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-500">
                  {t('admin.dashboard.noCustomerData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                {t('admin.dashboard.realtimeNotifications')}
              </CardTitle>
              <CardDescription>{t('admin.dashboard.latestEvents')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scroll-smooth" style={{scrollBehavior: 'smooth'}}>
                {notifications.map((notif) => (
                <Alert 
                  key={notif.id} 
                  className="animate-in slide-in-from-right duration-300"
                >
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold">{notif.title}</span>
                        <span className="ml-2 text-slate-600">{notif.message}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {notif.orderName && <span className="mr-3">{t('admin.dashboard.order')}: <strong>{notif.orderName}</strong></span>}
                        {notif.actor && <span>{t('admin.dashboard.actionBy')}: <strong>{notif.actor}</strong></span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{notif.time}</span>
                  </AlertDescription>
                </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;