import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Users, UserPlus, Edit2, ShieldAlert, Heart, Calendar, Plus, X, ToggleLeft, ToggleRight, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { useNotifications } from '../../context/NotificationContext';

interface FamilyMember {
  family_member_id: number;
  fk_primary_patient_id: number;
  full_name: string;
  age: number;
  gender: string;
  relationship: string;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function FamilyMembers() {
  const { t } = useTranslation();
  const apiFetch = useApi();
  const { addToast } = useNotifications();

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCount, setActiveCount] = useState(0);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Form States
  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenderDropdownOpen, setIsGenderDropdownOpen] = useState(false);

  const fetchFamilyMembers = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch('/api/v1/family-members?include_inactive=1');
      if (response && response.success) {
        setMembers(response.data || []);
        setActiveCount(response.meta?.active_total || 0);
      } else {
        addToast(response?.message || 'Failed to fetch family members', 'error');
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
      addToast('Network error fetching family members', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFamilyMembers();
  }, []);

  const openAddModal = () => {
    setEditingMember(null);
    setFullName('');
    setRelationship('');
    setAge('');
    setGender('male');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (member: FamilyMember) => {
    setEditingMember(member);
    setFullName(member.full_name);
    setRelationship(member.relationship);
    setAge(String(member.age));
    setGender(member.gender.toLowerCase());
    setDescription(member.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !relationship.trim() || !age.trim() || !gender) {
      addToast('Please fill all required fields.', 'warning');
      return;
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      addToast('Age must be between 1 and 120.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      let response;
      if (editingMember) {
        // Edit flow
        response = await apiFetch(`/api/v1/family-members/${editingMember.family_member_id}`, {
          method: 'PATCH',
          body: {
            full_name: fullName.trim(),
            relationship: relationship.trim(),
            age: parsedAge,
            gender: gender.toLowerCase(),
            description: description.trim() || null,
          },
        });
      } else {
        // Add flow
        if (activeCount >= 5) {
          addToast('Maximum 5 active family members are allowed.', 'warning');
          setIsSubmitting(false);
          return;
        }

        response = await apiFetch('/api/v1/family-members', {
          method: 'POST',
          body: {
            full_name: fullName.trim(),
            relationship: relationship.trim(),
            age: parsedAge,
            gender: gender.toLowerCase(),
            description: description.trim() || null,
          },
        });
      }

      if (response && response.success) {
        addToast(
          editingMember
            ? 'Family member updated successfully.'
            : 'Family member added successfully.',
          'success'
        );
        setIsModalOpen(false);
        fetchFamilyMembers();
      } else {
        addToast(response?.message || 'Action failed', 'error');
      }
    } catch (error) {
      console.error('Error saving family member:', error);
      addToast('Network error saving family member', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMemberActive = async (member: FamilyMember) => {
    const nextActive = member.is_active === 1 ? 0 : 1;

    if (nextActive === 1 && activeCount >= 5) {
      addToast('Maximum 5 active family members are allowed.', 'warning');
      return;
    }

    try {
      const response = await apiFetch(`/api/v1/family-members/${member.family_member_id}`, {
        method: 'PATCH',
        body: {
          is_active: nextActive,
        },
      });

      if (response && response.success) {
        addToast(
          nextActive === 1
            ? `${member.full_name} activated successfully.`
            : `${member.full_name} deactivated successfully.`,
          'success'
        );
        fetchFamilyMembers();
      } else {
        addToast(response?.message || 'Toggle failed', 'error');
      }
    } catch (error) {
      console.error('Error toggling member active state:', error);
      addToast('Network error updating status', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 py-6"
    >
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase flex items-center gap-3">
            <Users className="text-primary-teal" size={32} />
            {t('family_members.title', 'Family Members')}
          </h1>
          <p className="text-sm font-medium text-gray-400 mt-1">
            {t('family_members.subtitle', 'Manage up to 5 active dependents under your account.')}
          </p>
        </div>

        <button
          onClick={openAddModal}
          disabled={activeCount >= 5}
          className={`flex items-center gap-2 px-6 py-3.5 bg-primary-teal text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-primary-teal/20 transition-all ${activeCount >= 5
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
            }`}
        >
          <UserPlus size={16} />
          {t('family_members.add_new', 'Add Dependent')}
        </button>
      </div>

      {activeCount >= 5 && (
        <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-200 rounded-[20px] text-amber-800 text-xs font-bold mb-6">
          <AlertCircle size={18} className="shrink-0 text-amber-600" />
          <span>{t('family_members.limit_reached', 'Active dependents limit reached (5/5). Deactivate a member if you need to add another.')}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-primary-teal/20 border-t-primary-teal rounded-full animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-[30px] shadow-sm border border-gray-100 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-primary-teal/5 rounded-full flex items-center justify-center text-primary-teal mb-6">
            <Users size={36} />
          </div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-wide mb-2">{t('family_members.empty_title', 'No Family Members Found')}</h3>
          <p className="text-sm text-gray-400 font-medium max-w-sm mb-6">
            {t('family_members.empty_desc', "You haven't registered any family members yet. Add family members to easily book appointments for them.")}
          </p>
          <button
            onClick={openAddModal}
            className="cursor-pointer flex items-center gap-2 px-6 py-3.5 bg-primary-teal text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] transition-all"
          >
            <Plus size={16} />
            {t('family_members.add_new', 'Add Dependent')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => (
            <motion.div
              layout
              key={member.family_member_id}
              className={`bg-white rounded-[30px] border p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group shadow-sm hover:shadow-md ${member.is_active === 1 ? 'border-gray-100' : 'border-dashed border-gray-200 bg-gray-50/50'
                }`}
            >
              {/* Top Details */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${member.is_active === 1
                          ? 'bg-primary-teal/10 text-primary-teal'
                          : 'bg-gray-100 text-gray-400'
                        }`}
                    >
                      <Heart size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-800 tracking-tight uppercase line-clamp-1">
                        {member.full_name}
                      </h3>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary-teal">
                        {member.relationship}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${member.is_active === 1
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                      }`}
                  >
                    {member.is_active === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-t border-b border-gray-100/80 mb-4 text-xs font-bold text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>Age: {member.age} Yrs</span>
                  </div>
                  <div className="flex items-center gap-2 capitalize">
                    <Heart size={14} className="text-gray-400" />
                    <span>Gender: {member.gender}</span>
                  </div>
                </div>

                {member.description && (
                  <p className="text-xs text-gray-400 italic line-clamp-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    "{member.description}"
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between border-t border-gray-100/80 pt-4 mt-auto">
                <button
                  onClick={() => toggleMemberActive(member)}
                  className={`cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${member.is_active === 1
                      ? 'text-gray-400 hover:text-amber-600'
                      : 'text-gray-400 hover:text-emerald-600'
                    }`}
                >
                  {member.is_active === 1 ? (
                    <>
                      <ToggleRight size={18} className="text-emerald-500" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={18} />
                      Activate
                    </>
                  )}
                </button>

                <button
                  onClick={() => openEditModal(member)}
                  className="cursor-pointer flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#549E9E] hover:text-[#3D7474] transition-colors"
                >
                  <Edit2 size={12} />
                  Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#549E9E]/20 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-primary-teal to-primary-teal/90 text-white">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wide">
                    {editingMember ? 'Edit Dependent' : 'Add Dependent'}
                  </h3>
                  <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">
                    {editingMember ? 'Update details below' : 'Register a new family member'}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Name */}
                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-black text-primary-teal uppercase tracking-widest">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="Enter full name"
                      className="w-full bg-gray-50 border-none rounded-full py-3 px-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all text-sm"
                    />
                  </div>

                  {/* Relationship */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-primary-teal uppercase tracking-widest">
                      Relationship *
                    </label>
                    <input
                      type="text"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      required
                      placeholder="e.g. Spouse, Son"
                      className="w-full bg-gray-50 border-none rounded-full py-3 px-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all text-sm"
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-primary-teal uppercase tracking-widest">
                      Age *
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      required
                      min={1}
                      max={120}
                      placeholder="Age in years"
                      className="w-full bg-gray-50 border-none rounded-full py-3 px-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all text-sm"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-primary-teal uppercase tracking-widest">
                      Gender *
                    </label>
                    <div className="relative">
                      <div
                        className="w-full bg-gray-50 border-none rounded-full py-3 px-6 pr-12 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all text-sm cursor-pointer flex items-center justify-between"
                        onClick={() => setIsGenderDropdownOpen(!isGenderDropdownOpen)}
                      >
                        <span className="capitalize">{gender}</span>
                        <ChevronDown size={16} className={`text-primary-teal transition-transform duration-200 ${isGenderDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>

                      <AnimatePresence>
                        {isGenderDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={(e) => { e.stopPropagation(); setIsGenderDropdownOpen(false); }}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: -10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -10, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-2"
                            >
                              {['male', 'female', 'other'].map((opt) => (
                                <div
                                  key={opt}
                                  className={`px-6 py-3 cursor-pointer text-sm font-bold hover:bg-primary-teal/10 hover:text-primary-teal transition-colors capitalize flex items-center gap-2 ${gender === opt ? 'bg-primary-teal/5 text-primary-teal' : 'text-gray-700'}`}
                                  onClick={() => {
                                    setGender(opt);
                                    setIsGenderDropdownOpen(false);
                                  }}
                                >
                                  {opt}
                                  {gender === opt && <Check size={14} className="ml-auto" />}
                                </div>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Note/Description */}
                  <div className="space-y-2 md:col-span-3">
                    <label className="text-xs font-black text-primary-teal uppercase tracking-widest">
                      Description / Medical Notes
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional details like allergies, chronic issues, etc."
                      rows={2}
                      className="w-full bg-gray-50 border-none rounded-[20px] py-3 px-6 outline-none text-gray-700 font-bold focus:ring-2 focus:ring-primary-teal/20 transition-all text-sm resize-none"
                    />
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="cursor-pointer w-full sm:w-auto px-6 py-3.5 border border-gray-200 rounded-full font-black text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="cursor-pointer w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-teal text-white rounded-full font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Dependent'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
