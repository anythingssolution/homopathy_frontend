import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Layout, 
  // Image as ImageIcon,
  // MessageSquare,
  Video
} from 'lucide-react';

// import HeroCmsTab from '../../modules/doctor-cms/components/HeroCmsTab';
// import TestimonialsCmsTab from '../../modules/doctor-cms/components/TestimonialsCmsTab';
import GalleryCmsTab from '../../modules/doctor-cms/components/GalleryCmsTab';

export default function ManageCMS() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('gallery');

  const tabs = [
    // { id: 'hero', label: 'Hero Slides', icon: ImageIcon },
    // { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
    { id: 'gallery', label: 'Gallery', icon: Video },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      // case 'hero':
      //   return <HeroCmsTab />;
      // case 'testimonials':
      //   return <TestimonialsCmsTab />;
      case 'gallery':
        return <GalleryCmsTab />;
      default:
        return <GalleryCmsTab />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/doctor-portal')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                <Layout className="text-[#549E9E]" size={20} />
                Manage CMS
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Website Content Management System
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left ${
                  activeTab === tab.id 
                    ? 'bg-white shadow-sm border border-gray-100 text-[#549E9E] font-black' 
                    : 'text-gray-500 font-bold hover:bg-gray-100/50'
                }`}
              >
                <tab.icon size={18} className={activeTab === tab.id ? 'text-[#549E9E]' : 'text-gray-400'} />
                <span className="text-xs uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
              
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {renderActiveTab()}
              </motion.div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
