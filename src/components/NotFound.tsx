import React from 'react';
import { motion } from 'motion/react';
import { Home, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFDF7] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-teal/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#F2D06B]/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-2xl w-full text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Large 404 Visual */}
          <div className="relative inline-block mb-12">
            <h1 className="text-[12rem] lg:text-[16rem] font-black text-primary-teal opacity-[0.03] leading-none select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-white rounded-[40px] shadow-2xl flex items-center justify-center text-primary-teal border border-gray-100 rotate-12 transition-transform hover:rotate-0 duration-500">
                <AlertCircle size={64} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          <h2 className="text-3xl lg:text-5xl font-black text-[#549E9E] uppercase tracking-tighter mb-6">
            Oops! Path Not Found
          </h2>
          
          <p className="text-gray-500 font-medium text-lg leading-relaxed mb-12 max-w-md mx-auto">
            It seems like you've wandered into an unknown area. The page you are looking for might have been moved or doesn't exist.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link to="/">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-5 bg-[#549E9E] text-white rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary-teal/20 flex items-center gap-3"
              >
                <Home size={18} />
                Return Home
              </motion.button>
            </Link>
            
            <button 
              onClick={() => window.history.back()}
              className="px-10 py-5 bg-white text-primary-teal rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-lg border border-gray-100 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>
          </div>
        </motion.div>

        {/* Support Info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 pt-10 border-t border-gray-100/50"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Need Assistance?</p>
          <a href="tel:+917772043001" className="text-primary-teal font-black hover:underline tracking-tight">
            Contact Support: +91-7772043001
          </a>
        </motion.div>
      </div>

      {/* Scattered Decorations */}
      <div className="absolute top-[20%] right-[15%] text-primary-teal opacity-20 pointer-events-none select-none">✦</div>
      <div className="absolute bottom-[30%] left-[10%] text-[#F2D06B] opacity-30 pointer-events-none select-none text-xl">✧</div>
    </div>
  );
}
