import React from 'react';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-white p-12 rounded-[50px] border border-gray-100 shadow-sm text-center">
    <div className="w-20 h-20 bg-primary-teal/5 rounded-3xl flex items-center justify-center text-primary-teal mx-auto mb-8">
      <div className="animate-pulse w-8 h-8 bg-primary-teal/20 rounded-full" />
    </div>
    <h3 className="text-2xl font-black text-[#549E9E] uppercase tracking-widest mb-4">{title}</h3>
    <p className="text-gray-400 font-medium uppercase tracking-widest text-xs">No data available</p>
  </div>
);

export const Prescriptions = () => <PlaceholderPage title="My Prescriptions" />;
export const ClinicHistory = () => <PlaceholderPage title="Clinic History" />;
export const Bills = () => <PlaceholderPage title="Invoices & Bills" />;
export const Profile = () => <PlaceholderPage title="My Profile" />;
