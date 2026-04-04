'use client';

import { motion } from 'motion/react';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  Calendar, 
  BarChart3, 
  Filter, 
  MessageSquare, 
  HelpCircle,
  Sparkles,
  ChevronRight,
  Download
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

const stats = [
  { title: 'Total Patients', value: '1,284', change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
  { title: 'Appointments', value: '342', change: '+5%', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  { title: 'Revenue', value: '$12,450', change: '+18%', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { title: 'Active Tests', value: '89', change: '-2%', icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
];

const recentActivity = [
  { id: 1, action: 'New appointment booked', patient: 'Sarah Johnson', time: '10 mins ago', status: 'Pending' },
  { id: 2, action: 'Lab results uploaded', patient: 'Michael Chen', time: '1 hour ago', status: 'Completed' },
  { id: 3, action: 'Consultation finished', patient: 'Emma Davis', time: '2 hours ago', status: 'Completed' },
  { id: 4, action: 'New patient registered', patient: 'James Wilson', time: '3 hours ago', status: 'New' },
];

const faqs = [
  { q: 'How do I update my availability?', a: 'Navigate to Settings > Schedule to modify your working hours.' },
  { q: 'Can I export patient reports?', a: 'Yes, use the Export button in the Reports section to download CSV/PDF.' },
  { q: 'How does the AI assistant work?', a: 'The AI assistant helps draft responses and analyzes patient data securely.' },
];

export default function PartnerPortal() {
  return (
    <ProtectedRoute requiredRole="Partner">
      <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Partner Dashboard</h1>
              <p className="text-gray-500 mt-1">Operational insights and activity overview.</p>
            </div>
            <div className="flex space-x-3">
              <button className="flex items-center space-x-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm">
                <Calendar size={18} />
                <span>Today</span>
              </button>
              <button className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm">
                <Download size={18} />
                <span>Export</span>
              </button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <span className={`text-sm font-bold ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Reports & Analytics */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Reports & Analytics</h2>
                    <p className="text-sm text-gray-500 mt-1">Filter-based reporting and visualization</p>
                  </div>
                  <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                    <Filter size={20} />
                  </button>
                </div>
                
                {/* Mock Chart Area */}
                <div className="h-64 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center relative overflow-hidden group">
                  <div className="absolute inset-0 flex items-end px-4 pb-4 space-x-2 opacity-50">
                    {[40, 70, 45, 90, 65, 85, 100, 55, 75, 60, 80, 50].map((h, i) => (
                      <motion.div 
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 1, delay: i * 0.05 }}
                        className="flex-1 bg-emerald-200 rounded-t-md"
                      />
                    ))}
                  </div>
                  <div className="relative z-10 text-center">
                    <BarChart3 size={48} className="mx-auto text-emerald-600 mb-3 opacity-50 group-hover:scale-110 transition-transform" />
                    <p className="text-gray-500 font-medium">Interactive Analytics Visualization</p>
                  </div>
                </div>
              </motion.div>

              {/* Activity Overview */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
                  <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">View All</button>
                </div>
                
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <div className="flex items-center space-x-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.patient}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          activity.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                          activity.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {activity.status}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>

            {/* Sidebar: Support & AI */}
            <div className="space-y-8">
              
              {/* AI Support Assistant */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 shadow-sm border border-emerald-100 relative overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 text-emerald-200 opacity-50">
                  <Sparkles size={100} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-md">
                      <MessageSquare size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">AI Assistant</h2>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">Get instant help with operations, patient queries, or platform features.</p>
                  
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100/50 mb-4">
                    <p className="text-sm text-gray-700">&quot;How can I help you manage your clinic today?&quot;</p>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Ask anything..." 
                      className="w-full pl-4 pr-12 py-3 bg-white border border-emerald-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
                    />
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* FAQ Framework */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gray-100 rounded-xl text-gray-600">
                    <HelpCircle size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Quick FAQs</h2>
                </div>
                
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="group cursor-pointer">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors flex items-center justify-between">
                        {faq.q}
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 hidden group-hover:block transition-all">{faq.a}</p>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-6 py-2.5 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
                  View Support Center
                </button>
              </motion.div>

            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
