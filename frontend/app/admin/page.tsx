'use client';

import { motion } from 'motion/react';
import { 
  Building2, 
  TestTube2, 
  Stethoscope, 
  Briefcase, 
  Users, 
  GraduationCap, 
  Sparkles,
  Plus,
  ArrowRight
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

const onboardingItems = [
  { title: 'Diagnostic Labs', icon: Building2, color: 'bg-blue-500', count: 124 },
  { title: 'Lab Tests', icon: TestTube2, color: 'bg-purple-500', count: 850 },
  { title: 'Doctors & Specialties', icon: Stethoscope, color: 'bg-emerald-500', count: 342 },
  { title: 'Corporate Customers', icon: Briefcase, color: 'bg-orange-500', count: 45 },
  { title: 'Corporate Employees', icon: Users, color: 'bg-indigo-500', count: 12500 },
];

const trainingModules = [
  { title: 'Platform Basics', progress: 100, status: 'Completed' },
  { title: 'Advanced Diagnostics', progress: 60, status: 'In Progress' },
  { title: 'Patient Communication', progress: 0, status: 'Not Started' },
];

export default function AdminPortal() {
  return (
    <ProtectedRoute requiredRole="Admin">
      <div className="min-h-screen bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Admin Portal</h1>
              <p className="text-gray-500 mt-1">Centralized operational management and onboarding.</p>
            </div>
            <button className="flex items-center space-x-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm">
              <Plus size={18} />
              <span>Quick Add</span>
            </button>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Onboarding Capabilities */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 space-y-6"
            >
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-gray-900">Onboarding Capabilities</h2>
                  <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center">
                    View All <ArrowRight size={16} className="ml-1" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {onboardingItems.map((item, index) => (
                    <motion.div
                      key={item.title}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="p-5 rounded-2xl border border-gray-100 hover:border-emerald-100 hover:shadow-md transition-all cursor-pointer group bg-gray-50/50 hover:bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-xl text-white ${item.color} shadow-sm`}>
                          <item.icon size={20} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900">{item.count.toLocaleString()}</span>
                      </div>
                      <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Manage and onboard new entities</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Partner Training System */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <GraduationCap size={120} />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-emerald-800/50 rounded-lg">
                      <Sparkles size={20} className="text-emerald-300" />
                    </div>
                    <span className="text-sm font-bold tracking-wider text-emerald-300 uppercase">AI-Powered</span>
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Partner Training</h2>
                  <p className="text-emerald-100/80 text-sm mb-8">Generate structured learning content instantly using AI.</p>
                  
                  <button className="w-full py-3 bg-white text-emerald-950 rounded-xl font-bold hover:bg-emerald-50 transition-colors shadow-md flex items-center justify-center space-x-2">
                    <Sparkles size={18} />
                    <span>Generate Content</span>
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6">Structured Framework</h3>
                <div className="space-y-5">
                  {trainingModules.map((module, index) => (
                    <div key={module.title} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">{module.title}</span>
                        <span className="text-gray-500">{module.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${module.progress}%` }}
                          transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                          className={`h-full rounded-full ${
                            module.progress === 100 ? 'bg-emerald-500' : 
                            module.progress > 0 ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-6 py-2.5 border-2 border-gray-100 text-gray-600 rounded-xl font-medium hover:border-gray-200 hover:bg-gray-50 transition-colors">
                  View All Modules
                </button>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
